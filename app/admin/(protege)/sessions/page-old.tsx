import Link from 'next/link'
import { asc, desc, eq, sql as raw } from 'drizzle-orm'
import { AccesRefuse, AlerteSombre, SuccesSombre } from '@/components/AccesRefuse'
import { BarreSelection, EnTete, TitreSection, Vide } from '@/components/admin/Cockpit'
import { can, requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { attendance, cohorts, programModules, sessions, staff, trainerProfiles } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { formatDate } from '@/lib/format'
import { creerSession, modifierSession, planifierModules, regenererCode, sessionsEnMasse } from './actions'

export const dynamic = 'force-dynamic'

const t = fr.admin.sessions

/** « 09:00 » en heure de Brazzaville, pour les champs `time`. */
const heure = (d: Date) =>
  d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Brazzaville' })

/**
 * Les sessions : quand chaque module se tient, à quelle heure, avec quel
 * code de présence. Une par une, ou toute une promotion d'un coup.
 */
export default async function SessionsPage({
  searchParams,
}: {
  searchParams: { ok?: string; e?: string; n?: string; modifier?: string; cohort?: string }
}) {
  const session = await requirePermission('voirModules')
  if (!session) return <AccesRefuse />
  const peutModifier = can(session.user.role, 'gererSessions')

  const promotions = await db.select().from(cohorts).orderBy(asc(cohorts.startsOn))
  const cohort = promotions.find((c) => c.id === searchParams.cohort) ?? promotions[0]
  const maintenant = new Date()

  const [liste, modules] = await Promise.all([
    cohort
      ? db
          .select({
            id: sessions.id,
            moduleName: sessions.moduleName,
            heldOn: sessions.heldOn,
            dayCode: sessions.dayCode,
            opensAt: sessions.opensAt,
            closesAt: sessions.closesAt,
            presents: raw<number>`(select count(*) from ${attendance} a where a.session_id = ${sessions.id})::int`,
            formateur: trainerProfiles.fullName,
          })
          .from(sessions)
          .leftJoin(programModules, raw`${programModules.title} = ${sessions.moduleName} and ${programModules.programId} = ${cohort.programId}`)
          .leftJoin(staff, eq(staff.id, programModules.trainerId))
          .leftJoin(trainerProfiles, eq(trainerProfiles.staffId, staff.id))
          .where(eq(sessions.cohortId, cohort.id))
          .orderBy(desc(sessions.opensAt))
      : Promise.resolve([]),
    cohort?.programId
      ? db
          .select({ id: programModules.id, title: programModules.title, position: programModules.position, formateur: trainerProfiles.fullName })
          .from(programModules)
          .leftJoin(trainerProfiles, eq(trainerProfiles.staffId, programModules.trainerId))
          .where(eq(programModules.programId, cohort.programId))
          .orderBy(asc(programModules.position))
      : Promise.resolve([]),
  ])

  const aModifier = searchParams.modifier ? liste.find((s) => s.id === searchParams.modifier) : null
  const aVenir = liste.filter((s) => s.closesAt >= maintenant).length
  const message = searchParams.ok ? (t.messages[searchParams.ok as keyof typeof t.messages] ?? '').replace('{n}', searchParams.n ?? '') : null
  const erreur = searchParams.e ? t.messages[searchParams.e as keyof typeof t.messages] : null

  return (
    <div className="space-y-6">
      <EnTete
        titre={t.titre}
        sousTitre={t.sousTitre}
        actions={
          promotions.length > 1 ? (
            <form method="get" className="flex items-center gap-2">
              <select name="cohort" defaultValue={cohort?.id} className="bo-champ !w-auto !py-1.5" aria-label={fr.admin.utilisateurs.promotion}>
                {promotions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button type="submit" className="bo-bouton-discret">{fr.app.valider}</button>
            </form>
          ) : cohort ? (
            <span className="bo-puce">{cohort.name}</span>
          ) : null
        }
      />
      {message ? <SuccesSombre>{message}</SuccesSombre> : null}
      {erreur ? <AlerteSombre>{erreur}</AlerteSombre> : null}

      {!cohort ? (
        <Vide titre={t.aucunePromotion} />
      ) : (
        <>
          {/* ------------------------------------------------ liste + actions groupées */}
          <section className="bo-panneau group/selection">
            <TitreSection titre={t.liste} compte={liste.length} actions={<span className="bo-doux">{aVenir} {t.aVenir}</span>} />

            {peutModifier ? (
              <div className="mb-3">
                <BarreSelection formId="masse">
                  <input type="hidden" name="action" value="" />
                  <span className="text-sm font-semibold">{t.selection}</span>
                  <button formAction={sessionsEnMasse} name="action" value="supprimer" type="submit" className="bo-bouton-discret !border-bo-rose/50 !text-bo-rose">
                    {t.supprimerSelection}
                  </button>
                  <span className="bo-doux">·</span>
                  <label className="flex items-center gap-2 text-sm">
                    {t.decalerDe}
                    <input name="jours" type="number" defaultValue={7} className="bo-champ !w-20 !py-1" aria-label={t.jours} />
                    {t.jours}
                  </label>
                  <button formAction={sessionsEnMasse} name="action" value="decaler" type="submit" className="bo-bouton-discret">
                    {t.decaler}
                  </button>
                </BarreSelection>
              </div>
            ) : null}

            {liste.length === 0 ? (
              <Vide titre={t.aucune} texte={peutModifier ? t.aucuneAide : undefined} />
            ) : (
              <div className="overflow-x-auto">
                <table className="bo-tableau">
                  <thead>
                    <tr>
                      {peutModifier ? <th className="w-8"><span className="sr-only">{t.selection}</span></th> : null}
                      <th>{t.module}</th>
                      <th>{fr.app.date}</th>
                      <th>{t.horaire}</th>
                      <th>{t.formateur}</th>
                      <th>{t.codeDuJour}</th>
                      <th>{t.presents}</th>
                      {peutModifier ? <th>{fr.app.action}</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {liste.map((s) => {
                      const ouverte = s.opensAt <= maintenant && s.closesAt >= maintenant
                      const passee = s.closesAt < maintenant
                      return (
                        <tr key={s.id} className={passee ? 'opacity-70' : ''}>
                          {peutModifier ? (
                            <td>
                              <input form="masse" type="checkbox" name="sessionIds" value={s.id} aria-label={s.moduleName} className="h-4 w-4 accent-bo-bleu" />
                            </td>
                          ) : null}
                          <td className="font-medium">{s.moduleName}</td>
                          <td className="whitespace-nowrap">{formatDate(s.heldOn)}</td>
                          <td className="whitespace-nowrap tabular-nums">{heure(s.opensAt)} – {heure(s.closesAt)}</td>
                          <td>{s.formateur ?? <span className="bo-doux">—</span>}</td>
                          <td>
                            <span className={`font-mono text-sm ${ouverte ? 'text-bo-menthe' : ''}`}>{s.dayCode}</span>
                            {ouverte ? <span className="bo-puce ml-2 !border-bo-menthe/40 !text-bo-menthe">{t.enCours}</span> : null}
                          </td>
                          <td className="tabular-nums">{s.presents}</td>
                          {peutModifier ? (
                            <td>
                              <div className="flex flex-wrap items-center gap-2">
                                <Link href={`/admin/sessions?modifier=${s.id}${searchParams.cohort ? `&cohort=${searchParams.cohort}` : ''}`} className="bo-bouton-discret !px-3 !py-1 !text-xs">
                                  {fr.admin.utilisateurs.modifier}
                                </Link>
                                <form action={regenererCode}>
                                  <input type="hidden" name="sessionId" value={s.id} />
                                  <button type="submit" className="bo-bouton-discret !px-3 !py-1 !text-xs">{t.regenerer}</button>
                                </form>
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ------------------------------------------------------- modifier */}
          {peutModifier && aModifier ? (
            <section className="bo-panneau">
              <TitreSection titre={`${fr.admin.utilisateurs.modifier} — ${aModifier.moduleName}`} />
              <form action={modifierSession} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <input type="hidden" name="sessionId" value={aModifier.id} />
                <div className="sm:col-span-2">
                  <label className="bo-doux mb-1 block" htmlFor="m-module">{t.module}</label>
                  <select id="m-module" name="moduleName" defaultValue={aModifier.moduleName} className="bo-champ">
                    {modules.map((m) => (
                      <option key={m.id} value={m.title}>{m.position}. {m.title}</option>
                    ))}
                    {!modules.some((m) => m.title === aModifier.moduleName) ? <option value={aModifier.moduleName}>{aModifier.moduleName}</option> : null}
                  </select>
                </div>
                <div>
                  <label className="bo-doux mb-1 block" htmlFor="m-date">{t.dateSeance}</label>
                  <input id="m-date" name="heldOn" type="date" required defaultValue={aModifier.heldOn} className="bo-champ" />
                </div>
                <div>
                  <label className="bo-doux mb-1 block" htmlFor="m-debut">{t.debut}</label>
                  <input id="m-debut" name="debut" type="time" required defaultValue={heure(aModifier.opensAt)} className="bo-champ" />
                </div>
                <div>
                  <label className="bo-doux mb-1 block" htmlFor="m-fin">{t.fin}</label>
                  <input id="m-fin" name="fin" type="time" required defaultValue={heure(aModifier.closesAt)} className="bo-champ" />
                </div>
                <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-5">
                  <button type="submit" className="bo-bouton">{fr.app.enregistrer}</button>
                  <Link href="/admin/sessions" className="bo-bouton-discret">{fr.app.annuler}</Link>
                </div>
              </form>
            </section>
          ) : null}

          {peutModifier ? (
            <section className="grid gap-4 lg:grid-cols-2">
              {/* --------------------------------------------- une session */}
              <div className="bo-panneau">
                <TitreSection titre={t.creer} />
                {modules.length === 0 ? (
                  <Vide titre={t.aucunModule} texte={t.aucunModuleAide} action={<Link href="/admin/modules" className="bo-bouton">{fr.admin.nav.modules}</Link>} />
                ) : (
                  <form action={creerSession} className="grid gap-3 sm:grid-cols-3">
                    <input type="hidden" name="cohortId" value={cohort.id} />
                    <div className="sm:col-span-3">
                      <label className="bo-doux mb-1 block" htmlFor="module">{t.module}</label>
                      <select id="module" name="moduleName" required className="bo-champ">
                        {modules.map((m) => (
                          <option key={m.id} value={m.title}>{m.position}. {m.title}{m.formateur ? ` — ${m.formateur}` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="bo-doux mb-1 block" htmlFor="heldOn">{t.dateSeance}</label>
                      <input id="heldOn" name="heldOn" type="date" required className="bo-champ" />
                    </div>
                    <div>
                      <label className="bo-doux mb-1 block" htmlFor="debut">{t.debut}</label>
                      <input id="debut" name="debut" type="time" required defaultValue="09:00" className="bo-champ" />
                    </div>
                    <div>
                      <label className="bo-doux mb-1 block" htmlFor="fin">{t.fin}</label>
                      <input id="fin" name="fin" type="time" required defaultValue="12:00" className="bo-champ" />
                    </div>
                    <p className="bo-doux sm:col-span-3">{t.horaireAide}</p>
                    <div className="sm:col-span-3">
                      <button type="submit" className="bo-bouton">{t.creer}</button>
                    </div>
                  </form>
                )}
              </div>

              {/* -------------------------------------- toute la promotion */}
              <div className="bo-panneau">
                <TitreSection titre={t.planifier} />
                <p className="bo-doux mb-3">{t.planifierAide}</p>
                {modules.length === 0 ? (
                  <Vide titre={t.aucunModule} />
                ) : (
                  <form action={planifierModules} className="space-y-3">
                    <input type="hidden" name="cohortId" value={cohort.id} />
                    <ul className="space-y-1.5">
                      {modules.map((m) => (
                        <li key={m.id}>
                          <label className="flex items-center gap-2 rounded-lg border border-bo-bordure px-3 py-2 text-sm has-[:checked]:border-bo-bleu has-[:checked]:bg-bo-bleu-clair">
                            <input type="checkbox" name="moduleIds" value={m.id} defaultChecked className="h-4 w-4 accent-bo-bleu" />
                            <span className="flex-1">{m.position}. {m.title}</span>
                            {m.formateur ? <span className="bo-doux">{m.formateur}</span> : null}
                          </label>
                        </li>
                      ))}
                    </ul>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div>
                        <label className="bo-doux mb-1 block" htmlFor="premiereDate">{t.premiereDate}</label>
                        <input id="premiereDate" name="premiereDate" type="date" required className="bo-champ" />
                      </div>
                      <div>
                        <label className="bo-doux mb-1 block" htmlFor="p-debut">{t.debut}</label>
                        <input id="p-debut" name="debut" type="time" required defaultValue="09:00" className="bo-champ" />
                      </div>
                      <div>
                        <label className="bo-doux mb-1 block" htmlFor="p-fin">{t.fin}</label>
                        <input id="p-fin" name="fin" type="time" required defaultValue="12:00" className="bo-champ" />
                      </div>
                      <div>
                        <label className="bo-doux mb-1 block" htmlFor="intervalle">{t.intervalle}</label>
                        <select id="intervalle" name="intervalleJours" defaultValue="7" className="bo-champ">
                          <option value="1">{t.chaqueJour}</option>
                          <option value="7">{t.chaqueSemaine}</option>
                          <option value="14">{t.deuxSemaines}</option>
                        </select>
                      </div>
                    </div>
                    <button type="submit" className="bo-bouton">{t.planifier}</button>
                  </form>
                )}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
