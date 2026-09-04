import Link from 'next/link'
import { asc, desc, eq, ilike, or, sql as raw } from 'drizzle-orm'
import { AccesRefuse, AlerteSombre, SuccesSombre } from '@/components/AccesRefuse'
import { BarreSelection, EnTete, TitreSection } from '@/components/admin/Cockpit'
import { requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { cohorts, learners, ROLES, staff, trainerProfiles } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { formatDateTime, formatPercent } from '@/lib/format'
import {
  apprenantsEnMasse,
  changerRole,
  creerCompte,
  modifierApprenant,
  modifierFormateur,
  reinitialiserMotDePasse,
  renvoyerInvitation,
  supprimerApprenant,
  supprimerCompte,
  validerApprenant,
} from './actions'

export const dynamic = 'force-dynamic'

const t = fr.admin.utilisateurs

type Filtre = 'tous' | 'admin' | 'formateur' | 'apprenant' | 'attente'

/**
 * Tous les comptes dans une seule liste : administrateurs, formateurs et
 * apprenants, avec le rôle, le statut et la progression de chacun. Les
 * formateurs sont créés à la main ; les apprenants arrivent par Google et
 * restent « en attente » jusqu'à la validation d'un administrateur.
 * Tout est formulaire HTML ; les suppressions passent par une étape de
 * confirmation dans l'URL, pas par une boîte de dialogue JavaScript.
 */
export default async function UtilisateursPage({
  searchParams,
}: {
  searchParams: {
    ok?: string
    e?: string
    n?: string
    q?: string
    filtre?: string
    modifier?: string
    supprimer?: string
    supprimerApprenant?: string
    fiche?: string
  }
}) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) return <AccesRefuse />

  const recherche = (searchParams.q ?? '').trim()
  const filtre: Filtre = (['tous', 'admin', 'formateur', 'apprenant', 'attente'] as const).find((f) => f === searchParams.filtre) ?? 'tous'
  const motif = `%${recherche}%`

  const [equipe, promotions, apprenants, progressions] = await Promise.all([
    db
      .select({
        id: staff.id,
        email: staff.email,
        role: staff.role,
        nom: trainerProfiles.fullName,
        linkedin: trainerProfiles.linkedin,
        facebook: trainerProfiles.facebook,
        bio: trainerProfiles.bio,
        photoPath: trainerProfiles.photoPath,
        website: trainerProfiles.website,
        linktree: trainerProfiles.linktree,
        confirme: trainerProfiles.confirmedAt,
        invite: trainerProfiles.invitedAt,
        token: trainerProfiles.invitationToken,
      })
      .from(staff)
      .leftJoin(trainerProfiles, eq(trainerProfiles.staffId, staff.id))
      .where(recherche ? or(ilike(staff.email, motif), ilike(trainerProfiles.fullName, motif)) : raw`true`)
      .orderBy(asc(staff.role), asc(trainerProfiles.fullName), asc(staff.email)),
    db.select().from(cohorts).orderBy(asc(cohorts.startsOn)),
    db
      .select({
        id: learners.id,
        fullName: learners.fullName,
        phone: learners.phone,
        email: learners.email,
        cohortId: learners.cohortId,
        cohortName: cohorts.name,
        createdAt: learners.createdAt,
        validatedAt: learners.validatedAt,
      })
      .from(learners)
      .innerJoin(cohorts, eq(cohorts.id, learners.cohortId))
      .where(
        recherche
          ? or(
              ilike(learners.fullName, motif),
              ilike(learners.id, motif),
              raw`coalesce(${learners.email}, '') ilike ${motif}`,
              raw`coalesce(${learners.phone}, '') ilike ${motif}`,
            )
          : raw`true`,
      )
      .orderBy(desc(learners.createdAt))
      .limit(300),
    // La progression vient de la vue du parcours : 0 à 1, pour les apprenants.
    db.execute<{ learner_id: string; avancement: string | null }>(raw`select learner_id, avancement from v_learner_progress`),
  ])
  const progression = new Map(Array.from(progressions).map((p) => [p.learner_id, p.avancement ? Number(p.avancement) : 0]))

  const equipeVisible = equipe.filter((m) => filtre === 'tous' || filtre === m.role)
  const apprenantsVisibles = apprenants.filter((a) => filtre === 'tous' || filtre === 'apprenant' || (filtre === 'attente' && !a.validatedAt))
  const enAttente = apprenants.filter((a) => !a.validatedAt).length

  const aModifier = searchParams.modifier ? apprenants.find((a) => a.id === searchParams.modifier) : null
  const ficheOuverte = searchParams.fiche ? equipe.find((m) => m.role === 'formateur' && m.id === searchParams.fiche) : null
  const messageOk = searchParams.ok ? (t.messages[searchParams.ok as keyof typeof t.messages] ?? '').replace('{n}', searchParams.n ?? '') : null
  const messageErreur = searchParams.e ? t.messages[searchParams.e as keyof typeof t.messages] : null

  const lien = (params: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries({ q: recherche || undefined, filtre: filtre !== 'tous' ? filtre : undefined, ...params })) {
      if (v) p.set(k, v)
    }
    const s = p.toString()
    return `/admin/utilisateurs${s ? `?${s}` : ''}`
  }

  const filtres: { cle: Filtre; label: string; n: number }[] = [
    { cle: 'tous', label: t.filtreTous, n: equipe.length + apprenants.length },
    { cle: 'admin', label: fr.admin.roles.admin, n: equipe.filter((m) => m.role === 'admin').length },
    { cle: 'formateur', label: fr.admin.roles.formateur, n: equipe.filter((m) => m.role === 'formateur').length },
    { cle: 'apprenant', label: t.apprenant, n: apprenants.length },
    { cle: 'attente', label: t.enAttenteValidation, n: enAttente },
  ]

  return (
    <div className="space-y-6">
      <EnTete
        titre={t.titre}
        sousTitre={t.tousAide}
        actions={
          <>
            <a href="/admin/utilisateurs/export/equipe.xlsx" className="bo-bouton-discret" download>{t.exporter} · {t.equipe}</a>
            <a href="/admin/utilisateurs/export/apprenants.xlsx" className="bo-bouton-discret" download>{t.exporter} · {t.apprenants}</a>
          </>
        }
      />
      {messageOk ? <SuccesSombre>{messageOk}</SuccesSombre> : null}
      {messageErreur ? <AlerteSombre>{messageErreur}</AlerteSombre> : null}

      {/* ------------------------------------------------- la liste unique */}
      <section className="bo-panneau group/selection">
        <TitreSection
          titre={t.tous}
          compte={equipeVisible.length + apprenantsVisibles.length}
          actions={
            <form method="get" className="flex items-center gap-2">
              {filtre !== 'tous' ? <input type="hidden" name="filtre" value={filtre} /> : null}
              <input name="q" defaultValue={recherche} placeholder={t.rechercher} className="bo-champ !w-64 !py-1.5" />
              <button type="submit" className="bo-bouton-discret !py-1.5">{fr.backoffice.rechercher}</button>
            </form>
          }
        />

        {/* Filtres par rôle et statut, en onglets. */}
        <div className="bo-onglets mb-3">
          {filtres.map((f) => (
            <Link key={f.cle} href={lien({ filtre: f.cle === 'tous' ? undefined : f.cle })} className={f.cle === filtre ? 'bo-onglet-actif' : 'bo-onglet'}>
              {f.label} <span className={f.cle === filtre ? 'opacity-80' : 'bo-doux'}>({f.n})</span>
            </Link>
          ))}
        </div>

        {/* Actions groupées sur les apprenants cochés. */}
        <div className="mb-3">
          <BarreSelection formId="masse-apprenants">
            <span className="text-sm font-semibold">{t.selection}</span>
            <button formAction={apprenantsEnMasse} name="action" value="valider" type="submit" className="bo-bouton">{t.validerSelection}</button>
            <span className="bo-doux">·</span>
            <label className="flex items-center gap-2 text-sm">
              {t.deplacerVers}
              <select name="cohortId" className="bo-champ !w-auto !py-1" aria-label={t.promotion}>
                {promotions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <button formAction={apprenantsEnMasse} name="action" value="deplacer" type="submit" className="bo-bouton-discret">{t.deplacer}</button>
            <span className="bo-doux">·</span>
            <button formAction={apprenantsEnMasse} name="action" value="supprimer" type="submit" className="bo-bouton-discret !border-bo-rose/50 !text-bo-rose">{t.supprimerSelection}</button>
          </BarreSelection>
        </div>

        <div className="overflow-x-auto">
          <table className="bo-tableau">
            <thead>
              <tr>
                <th className="w-8"><span className="sr-only">{t.selection}</span></th>
                <th>{t.colonnePersonne}</th>
                <th>{t.role}</th>
                <th>{t.statutInscription}</th>
                <th>{t.colonneProgression}</th>
                <th>{fr.app.action}</th>
              </tr>
            </thead>
            <tbody>
              {equipeVisible.length + apprenantsVisibles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-bo-doux">{fr.app.aucuneDonnee}</td>
                </tr>
              ) : null}

              {/* ---------------------------------------------- l'équipe */}
              {equipeVisible.map((m) => {
                const estFormateur = m.role === 'formateur'
                const statut = !estFormateur ? t.confirme : m.confirme ? t.confirme : m.token ? t.invite : t.enAttente
                return (
                  <tr key={m.id}>
                    <td />
                    <td>
                      <span className="font-medium">{m.nom ?? m.email}</span>
                      {m.id === session.user.id ? <span className="bo-puce ml-2">{t.vous}</span> : null}
                      <span className="bo-doux block break-all">{m.nom ? m.email : ''}</span>
                    </td>
                    <td>
                      <form action={changerRole} className="flex items-center gap-1">
                        <input type="hidden" name="staffId" value={m.id} />
                        <select name="role" defaultValue={m.role} className="bo-champ !w-auto !py-1">
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{fr.admin.roles[r]}</option>
                          ))}
                        </select>
                        <button type="submit" className="bo-bouton-discret !px-3 !py-1.5 !text-xs">{fr.app.valider}</button>
                      </form>
                    </td>
                    <td className="whitespace-nowrap">
                      <span className={`bo-puce ${statut === t.confirme ? '!border-bo-menthe/40 !text-bo-menthe' : '!border-bo-jaune/60 !text-bo-jaune'}`}>{statut}</span>
                    </td>
                    <td className="bo-doux">—</td>
                    <td>
                      <div className="flex flex-wrap items-center gap-2">
                        <form action={reinitialiserMotDePasse} className="flex items-center gap-1">
                          <input type="hidden" name="staffId" value={m.id} />
                          <input name="password" type="password" minLength={8} required placeholder={t.reinitialiser} autoComplete="new-password" className="bo-champ !w-40 !py-1" />
                          <button type="submit" className="bo-bouton-discret !px-3 !py-1.5 !text-xs">{fr.app.valider}</button>
                        </form>
                        {estFormateur ? (
                          <Link href={lien({ fiche: m.id })} className="bo-bouton-discret !px-3 !py-1.5 !text-xs">{t.modifierFormateur}</Link>
                        ) : null}
                        {estFormateur && !m.confirme ? (
                          <form action={renvoyerInvitation}>
                            <input type="hidden" name="staffId" value={m.id} />
                            <button type="submit" className="bo-bouton-discret !px-3 !py-1.5 !text-xs">{t.renvoyerInvitation}</button>
                          </form>
                        ) : null}
                        {m.id !== session.user.id ? (
                          searchParams.supprimer === m.id ? (
                            <form action={supprimerCompte} className="flex items-center gap-2">
                              <input type="hidden" name="staffId" value={m.id} />
                              <span className="text-xs text-bo-rose">{t.confirmerSuppression}</span>
                              <button type="submit" className="bo-bouton-discret !border-bo-rose/50 !px-3 !py-1.5 !text-xs !text-bo-rose">{t.supprimer}</button>
                              <Link href={lien({})} className="bo-doux underline">{fr.app.annuler}</Link>
                            </form>
                          ) : (
                            <Link href={lien({ supprimer: m.id })} className="bo-bouton-discret !px-3 !py-1.5 !text-xs">{t.supprimer}</Link>
                          )
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}

              {/* ------------------------------------------- les apprenants */}
              {apprenantsVisibles.map((a) => {
                const pct = progression.get(a.id) ?? 0
                return (
                  <tr key={a.id}>
                    <td>
                      <input form="masse-apprenants" type="checkbox" name="learnerIds" value={a.id} aria-label={a.fullName} className="h-4 w-4 accent-bo-bleu" />
                    </td>
                    <td>
                      <span className="font-medium">{a.fullName}</span>
                      <span className="bo-doux block">
                        {a.id} · {a.cohortName}
                        {a.email ? ` · ${a.email}` : ''}
                        {a.phone ? ` · ${a.phone}` : ''}
                      </span>
                    </td>
                    <td>
                      <span className="bo-puce">{t.apprenant}</span>
                    </td>
                    <td className="whitespace-nowrap">
                      {a.validatedAt ? (
                        <span className="bo-puce !border-bo-menthe/40 !text-bo-menthe">{t.valide}</span>
                      ) : (
                        <span className="bo-puce !border-bo-jaune/60 !text-bo-jaune">{t.enAttenteValidation}</span>
                      )}
                      <span className="bo-doux block">{formatDateTime(a.createdAt)}</span>
                    </td>
                    <td className="w-44">
                      {a.validatedAt ? (
                        <div className="flex items-center gap-2">
                          <div className="bo-jauge flex-1">
                            <span className={pct >= 0.8 ? 'bg-bo-menthe' : pct >= 0.4 ? 'bg-bo-bleu' : 'bg-bo-jaune'} style={{ width: `${Math.max(2, pct * 100)}%` }} />
                          </div>
                          <span className="w-10 text-right text-xs tabular-nums">{formatPercent(pct)}</span>
                        </div>
                      ) : (
                        <span className="bo-doux">—</span>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center gap-2">
                        {!a.validatedAt ? (
                          <form action={validerApprenant}>
                            <input type="hidden" name="learnerId" value={a.id} />
                            <button type="submit" className="bo-bouton !px-3 !py-1.5 !text-xs">{t.valider}</button>
                          </form>
                        ) : null}
                        <Link href={lien({ modifier: a.id })} className="bo-bouton-discret !px-3 !py-1.5 !text-xs">{t.modifier}</Link>
                        {searchParams.supprimerApprenant === a.id ? (
                          <form action={supprimerApprenant} className="flex items-center gap-2">
                            <input type="hidden" name="learnerId" value={a.id} />
                            <span className="text-xs text-bo-rose">{t.confirmerSuppressionApprenant}</span>
                            <button type="submit" className="bo-bouton-discret !border-bo-rose/50 !px-3 !py-1.5 !text-xs !text-bo-rose">{t.supprimer}</button>
                            <Link href={lien({})} className="bo-doux underline">{fr.app.annuler}</Link>
                          </form>
                        ) : (
                          <Link href={lien({ supprimerApprenant: a.id })} className="bo-bouton-discret !px-3 !py-1.5 !text-xs">{t.supprimer}</Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ------------------------------------ modifier un apprenant */}
        {aModifier ? (
          <form action={modifierApprenant} className="bo-sous-panneau mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input type="hidden" name="learnerId" value={aModifier.id} />
            <div>
              <label className="bo-doux mb-1 block" htmlFor="m-fullName">{t.nom}</label>
              <input id="m-fullName" name="fullName" required defaultValue={aModifier.fullName} className="bo-champ" />
            </div>
            <div>
              <label className="bo-doux mb-1 block" htmlFor="m-phone">{t.telephone}</label>
              <input id="m-phone" name="phone" type="tel" defaultValue={aModifier.phone ?? ''} className="bo-champ" />
            </div>
            <div>
              <label className="bo-doux mb-1 block" htmlFor="m-email">{t.email}</label>
              <input id="m-email" name="email" type="email" defaultValue={aModifier.email ?? ''} className="bo-champ" />
            </div>
            <div>
              <label className="bo-doux mb-1 block" htmlFor="m-cohort">{t.promotion}</label>
              <select id="m-cohort" name="cohortId" defaultValue={aModifier.cohortId} className="bo-champ">
                {promotions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="bo-bouton">{fr.app.enregistrer}</button>
              <Link href={lien({})} className="bo-bouton-discret">{fr.app.annuler}</Link>
            </div>
          </form>
        ) : null}

        {/* ---------------------------- la fiche vitrine d'un formateur */}
        {ficheOuverte ? (
          <form action={modifierFormateur} encType="multipart/form-data" className="bo-sous-panneau mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input type="hidden" name="staffId" value={ficheOuverte.id} />
            <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
              {ficheOuverte.photoPath ? (
                <img src={`/api/formateurs/${ficheOuverte.id}/photo`} alt="" width={56} height={56} className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <span className="grid h-14 w-14 place-items-center rounded-full bg-bo-panneau-2 text-sm font-bold text-bo-doux">—</span>
              )}
              <div>
                <p className="font-semibold">{ficheOuverte.nom ?? ficheOuverte.email}</p>
                <p className="bo-doux">{t.modifierFormateur}</p>
              </div>
            </div>
            <div>
              <label className="bo-doux mb-1 block" htmlFor="f-nom">{t.nom}</label>
              <input id="f-nom" name="fullName" required maxLength={120} defaultValue={ficheOuverte.nom ?? ''} className="bo-champ" />
            </div>
            <div>
              <label className="bo-doux mb-1 block" htmlFor="f-linkedin">{t.linkedin}</label>
              <input id="f-linkedin" name="linkedin" type="url" defaultValue={ficheOuverte.linkedin ?? ''} placeholder="https://linkedin.com/in/…" className="bo-champ" />
            </div>
            <div>
              <label className="bo-doux mb-1 block" htmlFor="f-facebook">{t.facebook}</label>
              <input id="f-facebook" name="facebook" type="url" defaultValue={ficheOuverte.facebook ?? ''} placeholder="https://facebook.com/…" className="bo-champ" />
            </div>
            <div>
              <label className="bo-doux mb-1 block" htmlFor="f-website">{t.siteWeb}</label>
              <input id="f-website" name="website" type="url" defaultValue={ficheOuverte.website ?? ''} placeholder="https://" className="bo-champ" />
            </div>
            <div className="sm:col-span-2">
              <label className="bo-doux mb-1 block" htmlFor="f-photo">{t.photo}</label>
              <input id="f-photo" name="photo" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="bo-champ !py-1.5 file:mr-3 file:rounded-full file:border-0 file:bg-bo-bleu file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white" />
              <p className="bo-doux mt-1">{t.photoAide}</p>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="bo-doux mb-1 block" htmlFor="f-bio">{t.bio}</label>
              <textarea id="f-bio" name="bio" rows={3} maxLength={400} defaultValue={ficheOuverte.bio ?? ''} className="bo-champ" />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-3">
              <button type="submit" className="bo-bouton">{fr.app.enregistrer}</button>
              <Link href={lien({})} className="bo-bouton-discret">{fr.app.annuler}</Link>
            </div>
          </form>
        ) : null}
      </section>

      {/* ----------------------------------------- créer un compte du personnel */}
      <section className="bo-panneau">
        <TitreSection titre={t.creer} />
        <p className="bo-doux mb-3">{t.motDePasseAide}</p>
        <form action={creerCompte} encType="multipart/form-data" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="bo-doux mb-1 block" htmlFor="email">{t.email}</label>
            <input id="email" name="email" type="email" required autoComplete="off" placeholder="prenom.nom@gmail.com" className="bo-champ" />
          </div>
          <div>
            <label className="bo-doux mb-1 block" htmlFor="role">{t.role}</label>
            <select id="role" name="role" defaultValue="formateur" className="bo-champ">
              {ROLES.map((r) => (
                <option key={r} value={r}>{fr.admin.roles[r]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="bo-doux mb-1 block" htmlFor="password">{t.motDePasse}</label>
            <input id="password" name="password" type="password" minLength={8} autoComplete="new-password" className="bo-champ" />
          </div>
          <div>
            <label className="bo-doux mb-1 block" htmlFor="fullName">{t.nom}</label>
            <input id="fullName" name="fullName" maxLength={120} className="bo-champ" />
          </div>
          <div>
            <label className="bo-doux mb-1 block" htmlFor="phone">{t.telephone}</label>
            <input id="phone" name="phone" type="tel" maxLength={30} className="bo-champ" />
          </div>
          <div>
            <label className="bo-doux mb-1 block" htmlFor="linkedin">{t.linkedin}</label>
            <input id="linkedin" name="linkedin" type="url" placeholder="https://linkedin.com/in/…" className="bo-champ" />
          </div>
          <div>
            <label className="bo-doux mb-1 block" htmlFor="facebook">{t.facebook}</label>
            <input id="facebook" name="facebook" type="url" placeholder="https://facebook.com/…" className="bo-champ" />
          </div>
          <div>
            <label className="bo-doux mb-1 block" htmlFor="website">{t.siteWeb}</label>
            <input id="website" name="website" type="url" placeholder="https://" className="bo-champ" />
          </div>
          <div>
            <label className="bo-doux mb-1 block" htmlFor="photo">{t.photo}</label>
            <input id="photo" name="photo" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="bo-champ !py-1.5 file:mr-3 file:rounded-full file:border-0 file:bg-bo-bleu file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white" />
          </div>
          <div>
            <label className="bo-doux mb-1 block" htmlFor="linktree">{t.linktree}</label>
            <input id="linktree" name="linktree" type="url" placeholder="https://linktr.ee/…" className="bo-champ" />
          </div>
          <div>
            <label className="bo-doux mb-1 block" htmlFor="socials">{t.reseaux}</label>
            <input id="socials" name="socials" maxLength={300} className="bo-champ" />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <button type="submit" className="bo-bouton">{t.creer}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
