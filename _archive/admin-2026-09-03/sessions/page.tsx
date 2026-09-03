import { asc, desc, eq, sql as raw } from 'drizzle-orm'
import { AccesRefuse } from '@/components/AccesRefuse'
import { requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { attendance, cohorts, learners, programModules, sessions } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { formatDate, formatDateTime } from '@/lib/format'
import { AlerteSombre, SuccesSombre } from '@/components/AccesRefuse'
import { creerSession, regenererCode } from './actions'

export const dynamic = 'force-dynamic'

/** `YYYY-MM-DDTHH:mm` pour préremplir un champ datetime-local. */
function localInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: { e?: string; ok?: string; projection?: string }
}) {
  const session = await requirePermission('gererSessions')
  if (!session) return <AccesRefuse />

  const [cohort] = await db.select().from(cohorts).orderBy(asc(cohorts.startsOn)).limit(1)

  // Affichage plein écran du code, pour le vidéoprojecteur de la salle.
  if (searchParams.projection) {
    const [seance] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, searchParams.projection))
      .limit(1)
    if (seance) {
      return (
        <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
          <p className="text-lg text-bo-doux">
            {seance.moduleName} — {formatDate(seance.heldOn)}
          </p>
          <p className="my-6 font-mono text-7xl font-bold tracking-[0.2em] sm:text-9xl">
            {seance.dayCode}
          </p>
          <p className="text-bo-doux">{fr.admin.sessions.projectionAide}</p>
          <a href="/admin/sessions" className="bo-bouton-discret mt-8">
            {fr.app.retour}
          </a>
        </div>
      )
    }
  }

  const [rows, effectif] = await Promise.all([
    db
      .select({
        id: sessions.id,
        moduleName: sessions.moduleName,
        heldOn: sessions.heldOn,
        dayCode: sessions.dayCode,
        opensAt: sessions.opensAt,
        closesAt: sessions.closesAt,
        presents: raw<number>`count(${attendance.learnerId})::int`,
      })
      .from(sessions)
      .leftJoin(attendance, eq(attendance.sessionId, sessions.id))
      .where(cohort ? eq(sessions.cohortId, cohort.id) : raw`true`)
      .groupBy(sessions.id)
      .orderBy(desc(sessions.heldOn)),
    cohort
      ? db
          .select({ n: raw<number>`count(*)::int` })
          .from(learners)
          .where(eq(learners.cohortId, cohort.id))
      : Promise.resolve([{ n: 0 }]),
  ])

  // Les modules de la formation rattachée : proposés tels quels, pour que le
  // titre de la session soit exactement celui du module (c'est la clé des points).
  const modulesProposes = cohort?.programId
    ? await db
        .select({ title: programModules.title })
        .from(programModules)
        .where(eq(programModules.programId, cohort.programId))
        .orderBy(asc(programModules.position))
    : []

  const now = new Date()
  const debutDefaut = new Date(now)
  debutDefaut.setHours(8, 0, 0, 0)
  const finDefaut = new Date(now)
  finDefaut.setHours(18, 0, 0, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{fr.admin.sessions.titre}</h1>

      {searchParams.e ? <AlerteSombre>{fr.inscription.champManquant}</AlerteSombre> : null}
      {searchParams.ok === 'creee' ? <SuccesSombre>{fr.admin.sessions.creee}</SuccesSombre> : null}
      {searchParams.ok === 'code' ? <SuccesSombre>{fr.admin.sessions.codeRegenere}</SuccesSombre> : null}

      {cohort ? (
        <section className="bo-panneau">
          <h2 className="mb-3 font-semibold">{fr.admin.sessions.creer}</h2>
          <form action={creerSession} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="cohortId" value={cohort.id} />
            <div className="sm:col-span-2">
              <label className="bo-doux mb-1 block" htmlFor="moduleName">
                {fr.admin.sessions.module}
              </label>
              <input id="moduleName" name="moduleName" required list="modules-proposes" className="bo-champ" />
              <datalist id="modules-proposes">
                {modulesProposes.map((m) => (
                  <option key={m.title} value={m.title} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="bo-doux mb-1 block" htmlFor="heldOn">
                {fr.admin.sessions.dateSeance}
              </label>
              <input
                id="heldOn"
                name="heldOn"
                type="date"
                required
                defaultValue={localInputValue(now).slice(0, 10)}
                className="bo-champ"
              />
            </div>
            <div />
            <div>
              <label className="bo-doux mb-1 block" htmlFor="opensAt">
                {fr.admin.sessions.ouvreA}
              </label>
              <input
                id="opensAt"
                name="opensAt"
                type="datetime-local"
                required
                defaultValue={localInputValue(debutDefaut)}
                className="bo-champ"
              />
            </div>
            <div>
              <label className="bo-doux mb-1 block" htmlFor="closesAt">
                {fr.admin.sessions.fermeA}
              </label>
              <input
                id="closesAt"
                name="closesAt"
                type="datetime-local"
                required
                defaultValue={localInputValue(finDefaut)}
                className="bo-champ"
              />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="bo-bouton-discret">
                {fr.admin.sessions.creer}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 font-semibold">{fr.admin.sessions.liste}</h2>
        {rows.length === 0 ? (
          <p className="bo-panneau">{fr.app.aucuneDonnee}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="bo-tableau">
              <thead>
                <tr>
                  <th>{fr.admin.sessions.module}</th>
                  <th>{fr.app.date}</th>
                  <th>{fr.admin.sessions.codeDuJour}</th>
                  <th>{fr.admin.sessions.ouvreA}</th>
                  <th>{fr.admin.sessions.fermeA}</th>
                  <th>{fr.admin.sessions.presents}</th>
                  <th>{fr.app.action}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.moduleName}</td>
                    <td className="whitespace-nowrap">{formatDate(row.heldOn)}</td>
                    <td className="font-mono text-lg font-bold tracking-widest">
                      {row.dayCode}
                    </td>
                    <td className="whitespace-nowrap">{formatDateTime(row.opensAt)}</td>
                    <td className="whitespace-nowrap">{formatDateTime(row.closesAt)}</td>
                    <td>
                      {row.presents} / {effectif[0]?.n ?? 0}
                    </td>
                    <td className="whitespace-nowrap">
                      <a
                        href={`/admin/sessions?projection=${row.id}`}
                        className="bo-bouton-discret mr-2"
                      >
                        {fr.admin.sessions.projeter}
                      </a>
                      <form action={regenererCode} className="mt-1 inline-block">
                        <input type="hidden" name="sessionId" value={row.id} />
                        <button type="submit" className="bo-bouton-discret">
                          {fr.admin.sessions.regenerer}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
