import Link from 'next/link'
import { asc, desc, eq, inArray } from 'drizzle-orm'
import { AccesRefuse, AlerteSombre, SuccesSombre } from '@/components/AccesRefuse'
import { requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { cohorts, learners, MODULE_DECISIONS, pointsLedger, programModules } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { formatDateTime, formatPercent } from '@/lib/format'
import { completions, pointsParModule, type ModulePoints } from '@/lib/points'
import { crediterManuel, decider } from './actions'

export const dynamic = 'force-dynamic'

const t = fr.admin.points

const TEINTE: Record<ModulePoints['statut'], string> = {
  valide: 'border-bo-menthe/50 text-bo-menthe',
  a_refaire: 'border-bo-jaune/50 text-bo-jaune',
  exclu: 'border-bo-rose/50 text-bo-rose',
  en_cours: 'border-bo-cyan/40 text-bo-cyan',
  non_commence: 'border-bo-bordure text-bo-doux',
}

/**
 * La grille apprenant × module : points, pourcentage, statut. C'est ici que le
 * formateur voit qui est sous les 70 % et décide : refaire le Kahoot, ou sortir.
 */
export default async function PointsPage({ searchParams }: { searchParams: { cohorte?: string; ok?: string; e?: string } }) {
  const session = await requirePermission('gererPoints')
  if (!session) return <AccesRefuse />

  const promotions = await db.select().from(cohorts).orderBy(asc(cohorts.startsOn))
  const promotion = promotions.find((p) => p.id === searchParams.cohorte) ?? promotions[0]
  if (!promotion) return <p className="bo-panneau">{fr.app.aucuneDonnee}</p>

  const modules = promotion.programId
    ? await db.select().from(programModules).where(eq(programModules.programId, promotion.programId)).orderBy(asc(programModules.position))
    : []
  const [grille, totaux, apprenants, journal] = await Promise.all([
    modules.length ? pointsParModule(promotion.id) : Promise.resolve([] as ModulePoints[]),
    modules.length ? completions(promotion.id) : Promise.resolve([]),
    db.select({ id: learners.id, fullName: learners.fullName }).from(learners).where(eq(learners.cohortId, promotion.id)).orderBy(asc(learners.fullName)),
    modules.length
      ? db
          .select({ l: pointsLedger, module: programModules.title, nom: learners.fullName })
          .from(pointsLedger)
          .innerJoin(learners, eq(learners.id, pointsLedger.learnerId))
          .leftJoin(programModules, eq(programModules.id, pointsLedger.moduleId))
          .where(inArray(pointsLedger.moduleId, modules.map((m) => m.id)))
          .orderBy(desc(pointsLedger.createdAt))
          .limit(25)
      : Promise.resolve([]),
  ])
  const parApprenant = new Map<string, Map<string, ModulePoints>>()
  for (const g of grille) {
    if (!parApprenant.has(g.learner_id)) parApprenant.set(g.learner_id, new Map())
    parApprenant.get(g.learner_id)!.set(g.module_id, g)
  }

  const messageOk = searchParams.ok ? t.messages[searchParams.ok as keyof typeof t.messages] : null
  const messageErreur = searchParams.e ? t.messages[searchParams.e as keyof typeof t.messages] : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t.titre}</h1>
          <p className="mt-1 text-sm text-bo-doux">{t.sousTitre}</p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <select name="cohorte" defaultValue={promotion.id} className="bo-champ !w-auto" aria-label={fr.admin.utilisateurs.promotion}>
            {promotions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button type="submit" className="bo-bouton-discret">{fr.app.valider}</button>
        </form>
      </div>
      {messageOk ? <SuccesSombre>{messageOk}</SuccesSombre> : null}
      {messageErreur ? <AlerteSombre>{messageErreur}</AlerteSombre> : null}

      {modules.length === 0 ? (
        <AlerteSombre>
          {t.aucuneFormation} <Link href="/admin/formations" className="underline">{fr.admin.nav.formations}</Link>
        </AlerteSombre>
      ) : (
        <>
          <section className="bo-panneau">
            <div className="mb-3 flex flex-wrap gap-2">
              {(Object.keys(TEINTE) as ModulePoints['statut'][]).map((s) => (
                <span key={s} className={`bo-puce !bg-transparent ${TEINTE[s]}`}>{t.statuts[s]}</span>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="bo-tableau">
                <thead>
                  <tr>
                    <th>{t.apprenant}</th>
                    {modules.map((m) => (
                      <th key={m.id} className="whitespace-nowrap" title={m.title}>
                        {m.position}. {m.title.length > 18 ? `${m.title.slice(0, 18)}…` : m.title}
                        <span className="block font-normal normal-case tracking-normal">/{m.pointsTotal} · ×{m.weight}</span>
                      </th>
                    ))}
                    <th>{t.completion}</th>
                    <th>{t.valides}</th>
                  </tr>
                </thead>
                <tbody>
                  {totaux.map((c) => {
                    const cellules = parApprenant.get(c.learner_id)
                    return (
                      <tr key={c.learner_id} className={c.exclu ? 'opacity-60' : ''}>
                        <td>
                          <Link href={`/admin/learners/${c.learner_id}`} className="hover:underline">{c.full_name}</Link>
                          <span className="bo-doux block">{c.learner_id}</span>
                        </td>
                        {modules.map((m) => {
                          const cel = cellules?.get(m.id)
                          if (!cel) return <td key={m.id}>—</td>
                          return (
                            <td key={m.id}>
                              <span className={`bo-puce !bg-transparent tabular-nums ${TEINTE[cel.statut]}`}>
                                {cel.points_acquis} · {formatPercent(cel.pct)}
                              </span>
                            </td>
                          )
                        })}
                        <td className="tabular-nums font-semibold">{formatPercent(c.completion)}</td>
                        <td className="tabular-nums">
                          {c.modules_valides}/{c.modules_total}
                          {c.exclu ? <span className="ml-2 text-bo-rose">{t.statuts.exclu}</span> : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <form action={crediterManuel} className="bo-panneau grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="cohorte" value={promotion.id} />
              <h2 className="font-semibold sm:col-span-2">{t.crediter}</h2>
              <div>
                <label className="bo-doux mb-1 block" htmlFor="c-learner">{t.apprenant}</label>
                <select id="c-learner" name="learnerId" required className="bo-champ">
                  {apprenants.map((a) => (
                    <option key={a.id} value={a.id}>{a.fullName} — {a.id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="bo-doux mb-1 block" htmlFor="c-module">{t.module}</label>
                <select id="c-module" name="moduleId" required className="bo-champ">
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>{m.position}. {m.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="bo-doux mb-1 block" htmlFor="c-points">{t.pointsChamp}</label>
                <input id="c-points" name="points" type="number" required className="bo-champ" />
              </div>
              <div>
                <label className="bo-doux mb-1 block" htmlFor="c-note">{t.note}</label>
                <input id="c-note" name="note" maxLength={200} placeholder="Ex. : score Kahoot 8/10" className="bo-champ" />
              </div>
              <div className="sm:col-span-2">
                <button type="submit" className="bo-bouton">{t.crediter}</button>
              </div>
            </form>

            <form action={decider} className="bo-panneau grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="cohorte" value={promotion.id} />
              <h2 className="font-semibold sm:col-span-2">{t.decider}</h2>
              <p className="bo-doux sm:col-span-2">{t.decisionAide}</p>
              <div>
                <label className="bo-doux mb-1 block" htmlFor="d-learner">{t.apprenant}</label>
                <select id="d-learner" name="learnerId" required className="bo-champ">
                  {apprenants.map((a) => (
                    <option key={a.id} value={a.id}>{a.fullName} — {a.id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="bo-doux mb-1 block" htmlFor="d-module">{t.module}</label>
                <select id="d-module" name="moduleId" required className="bo-champ">
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>{m.position}. {m.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="bo-doux mb-1 block" htmlFor="d-decision">{t.decision}</label>
                <select id="d-decision" name="decision" defaultValue="a_refaire" className="bo-champ">
                  {MODULE_DECISIONS.map((d) => (
                    <option key={d} value={d}>{t.statuts[d]}</option>
                  ))}
                  <option value="auto">{t.retirerDecision}</option>
                </select>
              </div>
              <div>
                <label className="bo-doux mb-1 block" htmlFor="d-note">{t.note}</label>
                <input id="d-note" name="note" maxLength={200} className="bo-champ" />
              </div>
              <div className="sm:col-span-2">
                <button type="submit" className="bo-bouton">{t.decider}</button>
              </div>
            </form>
          </section>

          <section className="bo-panneau">
            <h2 className="mb-2 font-semibold">{t.journal}</h2>
            <div className="overflow-x-auto">
              <table className="bo-tableau">
                <thead>
                  <tr>
                    <th>{fr.app.date}</th>
                    <th>{t.apprenant}</th>
                    <th>{t.module}</th>
                    <th>{fr.app.type}</th>
                    <th>{fr.learner.quiz.points}</th>
                    <th>{t.note}</th>
                  </tr>
                </thead>
                <tbody>
                  {journal.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-bo-doux">{fr.app.aucuneDonnee}</td>
                    </tr>
                  ) : null}
                  {journal.map(({ l, module, nom }) => (
                    <tr key={l.id}>
                      <td className="whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                      <td>{nom}</td>
                      <td>{module ?? '—'}</td>
                      <td>{t.sources[l.source]}</td>
                      <td className={`tabular-nums font-semibold ${l.points < 0 ? 'text-bo-rose' : 'text-bo-menthe'}`}>
                        {l.points > 0 ? `+${l.points}` : l.points}
                      </td>
                      <td>{l.note ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
