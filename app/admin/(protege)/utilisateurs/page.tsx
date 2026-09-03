import Link from 'next/link'
import { asc, desc, eq, ilike, or, sql as raw } from 'drizzle-orm'
import { AccesRefuse, AlerteSombre, SuccesSombre } from '@/components/AccesRefuse'
import { requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { cohorts, learners, ROLES, staff, trainerProfiles } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { formatDateTime } from '@/lib/format'
import {
  changerRole,
  creerCompte,
  modifierApprenant,
  reinitialiserMotDePasse,
  renvoyerInvitation,
  supprimerApprenant,
  supprimerCompte,
} from './actions'

export const dynamic = 'force-dynamic'

const t = fr.admin.utilisateurs

/**
 * Gestion des comptes : administrateurs, formateurs et apprenants au même
 * endroit. Tout est formulaire HTML ; les suppressions passent par une étape
 * de confirmation dans l'URL, pas par une boîte de dialogue JavaScript.
 */
export default async function UtilisateursPage({
  searchParams,
}: {
  searchParams: { ok?: string; e?: string; q?: string; modifier?: string; supprimer?: string; supprimerApprenant?: string }
}) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) return <AccesRefuse />

  const recherche = (searchParams.q ?? '').trim()
  const [equipe, promotions, apprenants] = await Promise.all([
    db
      .select({
        id: staff.id,
        email: staff.email,
        role: staff.role,
        nom: trainerProfiles.fullName,
        linkedin: trainerProfiles.linkedin,
        website: trainerProfiles.website,
        linktree: trainerProfiles.linktree,
        confirme: trainerProfiles.confirmedAt,
        invite: trainerProfiles.invitedAt,
        token: trainerProfiles.invitationToken,
      })
      .from(staff)
      .leftJoin(trainerProfiles, eq(trainerProfiles.staffId, staff.id))
      .orderBy(asc(staff.role), asc(staff.email)),
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
      })
      .from(learners)
      .innerJoin(cohorts, eq(cohorts.id, learners.cohortId))
      .where(
        recherche
          ? or(
              ilike(learners.fullName, `%${recherche}%`),
              ilike(learners.id, `%${recherche}%`),
              raw`coalesce(${learners.phone}, '') ilike ${`%${recherche}%`}`,
            )
          : raw`true`,
      )
      .orderBy(desc(learners.createdAt))
      .limit(200),
  ])

  const aModifier = searchParams.modifier ? apprenants.find((a) => a.id === searchParams.modifier) : null
  const messageOk = searchParams.ok ? t.messages[searchParams.ok as keyof typeof t.messages] : null
  const messageErreur = searchParams.e ? t.messages[searchParams.e as keyof typeof t.messages] : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">{t.titre}</h1>
        <p className="mt-1 text-sm text-bo-doux">{t.sousTitre}</p>
      </div>
      {messageOk ? <SuccesSombre>{messageOk}</SuccesSombre> : null}
      {messageErreur ? <AlerteSombre>{messageErreur}</AlerteSombre> : null}

      {/* ------------------------------------------------ équipe */}
      <section className="bo-panneau">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{t.equipe}</h2>
          <a href="/admin/utilisateurs/export/equipe.xlsx" className="bo-bouton-discret" download>
            {t.exporter}
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="bo-tableau">
            <thead>
              <tr>
                <th>{t.email}</th>
                <th>{t.nom}</th>
                <th>{t.role}</th>
                <th>{t.statut}</th>
                <th>{fr.app.action}</th>
              </tr>
            </thead>
            <tbody>
              {equipe.map((m) => {
                const estFormateur = m.role === 'formateur'
                const statut = !estFormateur
                  ? '—'
                  : m.confirme
                    ? t.confirme
                    : m.token
                      ? t.invite
                      : t.enAttente
                return (
                  <tr key={m.id}>
                    <td className="break-all">
                      {m.email}
                      {m.id === session.user.id ? <span className="bo-puce ml-2">{t.vous}</span> : null}
                    </td>
                    <td>
                      {m.nom ?? '—'}
                      {m.linkedin || m.website || m.linktree ? (
                        <span className="bo-doux block">
                          {[m.linkedin, m.website, m.linktree].filter(Boolean).join(' · ')}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <form action={changerRole} className="flex items-center gap-1">
                        <input type="hidden" name="staffId" value={m.id} />
                        <select name="role" defaultValue={m.role} className="bo-champ !w-auto !py-1">
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {fr.admin.roles[r]}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="bo-bouton-discret !px-3 !py-1.5 !text-xs">
                          {fr.app.valider}
                        </button>
                      </form>
                    </td>
                    <td className="whitespace-nowrap">{statut}</td>
                    <td>
                      <div className="flex flex-wrap items-center gap-2">
                        <form action={reinitialiserMotDePasse} className="flex items-center gap-1">
                          <input type="hidden" name="staffId" value={m.id} />
                          <input
                            name="password"
                            type="password"
                            minLength={8}
                            required
                            placeholder={t.reinitialiser}
                            autoComplete="new-password"
                            className="bo-champ !w-44 !py-1"
                          />
                          <button type="submit" className="bo-bouton-discret !px-3 !py-1.5 !text-xs">
                            {fr.app.valider}
                          </button>
                        </form>
                        {estFormateur && !m.confirme ? (
                          <form action={renvoyerInvitation}>
                            <input type="hidden" name="staffId" value={m.id} />
                            <button type="submit" className="bo-bouton-discret !px-3 !py-1.5 !text-xs">
                              {t.renvoyerInvitation}
                            </button>
                          </form>
                        ) : null}
                        {m.id !== session.user.id ? (
                          searchParams.supprimer === m.id ? (
                            <form action={supprimerCompte} className="flex items-center gap-2">
                              <input type="hidden" name="staffId" value={m.id} />
                              <span className="text-xs text-bo-rose">{t.confirmerSuppression}</span>
                              <button type="submit" className="bo-bouton-discret !border-bo-rose/50 !px-3 !py-1.5 !text-xs !text-bo-rose">
                                {t.supprimer}
                              </button>
                              <Link href="/admin/utilisateurs" className="bo-doux underline">
                                {fr.app.annuler}
                              </Link>
                            </form>
                          ) : (
                            <Link href={`/admin/utilisateurs?supprimer=${m.id}`} className="bo-bouton-discret !px-3 !py-1.5 !text-xs">
                              {t.supprimer}
                            </Link>
                          )
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <h3 className="mb-3 mt-6 font-semibold">{t.creer}</h3>
        <form action={creerCompte} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="bo-doux mb-1 block" htmlFor="email">{t.email}</label>
            <input id="email" name="email" type="email" required autoComplete="off" className="bo-champ" />
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
            <p className="bo-doux mt-1">{t.motDePasseAide}</p>
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
            <label className="bo-doux mb-1 block" htmlFor="website">{t.siteWeb}</label>
            <input id="website" name="website" type="url" placeholder="https://" className="bo-champ" />
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

      {/* --------------------------------------------- apprenants */}
      <section className="bo-panneau">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">
            {t.apprenants} <span className="bo-doux">({apprenants.length})</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <form method="get" className="flex items-center gap-2">
              <input name="q" defaultValue={recherche} placeholder={t.rechercher} className="bo-champ !w-64 !py-1.5" />
              <button type="submit" className="bo-bouton-discret !py-1.5">{fr.backoffice.rechercher}</button>
            </form>
            <a href="/admin/utilisateurs/export/apprenants.xlsx" className="bo-bouton-discret !py-1.5" download>{t.exporter}</a>
          </div>
        </div>

        {aModifier ? (
          <form action={modifierApprenant} className="bo-sous-panneau mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
              <Link href="/admin/utilisateurs" className="bo-bouton-discret">{fr.app.annuler}</Link>
            </div>
          </form>
        ) : null}

        <div className="overflow-x-auto">
          <table className="bo-tableau">
            <thead>
              <tr>
                <th>{fr.backoffice.colonneApprenant}</th>
                <th>{t.promotion}</th>
                <th>{t.telephone}</th>
                <th>{t.email}</th>
                <th>{t.colonneInscrit}</th>
                <th>{fr.app.action}</th>
              </tr>
            </thead>
            <tbody>
              {apprenants.map((a) => (
                <tr key={a.id}>
                  <td>
                    <span className="font-medium">{a.fullName}</span>
                    <span className="bo-doux block">{a.id}</span>
                  </td>
                  <td>{a.cohortName}</td>
                  <td className="whitespace-nowrap">{a.phone ?? '—'}</td>
                  <td className="break-all">{a.email ?? '—'}</td>
                  <td className="whitespace-nowrap">{formatDateTime(a.createdAt)}</td>
                  <td>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/utilisateurs?modifier=${a.id}${recherche ? `&q=${encodeURIComponent(recherche)}` : ''}`} className="bo-bouton-discret !px-3 !py-1.5 !text-xs">
                        {t.modifier}
                      </Link>
                      {searchParams.supprimerApprenant === a.id ? (
                        <form action={supprimerApprenant} className="flex items-center gap-2">
                          <input type="hidden" name="learnerId" value={a.id} />
                          <span className="text-xs text-bo-rose">{t.confirmerSuppressionApprenant}</span>
                          <button type="submit" className="bo-bouton-discret !border-bo-rose/50 !px-3 !py-1.5 !text-xs !text-bo-rose">
                            {t.supprimer}
                          </button>
                          <Link href="/admin/utilisateurs" className="bo-doux underline">{fr.app.annuler}</Link>
                        </form>
                      ) : (
                        <Link href={`/admin/utilisateurs?supprimerApprenant=${a.id}`} className="bo-bouton-discret !px-3 !py-1.5 !text-xs">
                          {t.supprimer}
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
