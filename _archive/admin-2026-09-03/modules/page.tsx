import Link from 'next/link'
import { asc } from 'drizzle-orm'
import { AccesRefuse } from '@/components/AccesRefuse'
import { Jauge } from '@/components/Progression'
import { requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { cohorts } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { formatPercent } from '@/lib/format'
import { getCohortProgress, getModulesOverview } from '@/lib/queries'

export const dynamic = 'force-dynamic'

/**
 * Avancement de la promotion module par module : ce que le formateur regarde
 * pour savoir quel module rattraper avant de passer au suivant.
 */
export default async function ModulesPage() {
  const session = await requirePermission('voirTableauBord')
  if (!session) return <AccesRefuse />

  const [cohorte] = await db.select().from(cohorts).orderBy(asc(cohorts.startsOn)).limit(1)
  const [modules, progression] = await Promise.all([
    getModulesOverview(cohorte?.id),
    getCohortProgress(cohorte?.id),
  ])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold">{fr.backoffice.modules}</h1>
        <p className="bo-doux">{cohorte?.name}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((m) => {
          const moyenne = m.avancement_moyen ? Number(m.avancement_moyen) : 0
          const part = m.effectif > 0 ? m.termine_par / m.effectif : 0
          return (
            <article key={m.module_name} className="bo-panneau">
              <div className="flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-bo-panneau-2 text-sm font-bold text-bo-doux">
                  {m.position}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold leading-snug">{m.module_name}</h2>
                  <p className="bo-doux mt-0.5">
                    {m.seances_tenues}/{m.seances_prevues} {fr.backoffice.seances}
                  </p>
                </div>
              </div>

              <p className="bo-chiffre mt-4">{formatPercent(moyenne)}</p>
              <p className="bo-doux">{fr.backoffice.moduleColonneAvancement}</p>
              <Jauge
                valeur={moyenne}
                statut={moyenne >= 0.8 ? 'termine' : moyenne >= 0.4 ? 'en_cours' : 'non_commence'}
                className="mt-3"
              />

              <p className="mt-4 text-sm">
                <strong className="text-bo-menthe">{m.termine_par}</strong>
                <span className="text-bo-doux">
                  {' '}
                  / {m.effectif} — {fr.backoffice.moduleColonneTermine.toLowerCase()} (
                  {formatPercent(part)})
                </span>
              </p>
            </article>
          )
        })}
      </section>

      {/* Grille apprenant × module : la vue qui montre où ça coince. */}
      <section className="bo-panneau">
        <h2 className="bo-titre mb-3">{fr.backoffice.apprenants}</h2>
        <div className="overflow-x-auto">
          <table className="bo-tableau">
            <thead>
              <tr>
                <th>{fr.backoffice.colonneApprenant}</th>
                <th>{fr.backoffice.colonneAvancement}</th>
                <th>{fr.backoffice.colonneModules}</th>
                <th>{fr.backoffice.colonneQuiz}</th>
                <th>{fr.backoffice.colonneCertificat}</th>
              </tr>
            </thead>
            <tbody>
              {progression.map((p) => {
                const pct = Number(p.avancement ?? 0)
                return (
                  <tr key={p.learner_id}>
                    <td>
                      <Link href={`/admin/learners/${p.learner_id}`} className="hover:underline">
                        {p.full_name}
                      </Link>
                      <span className="bo-doux block">{p.learner_id}</span>
                    </td>
                    <td className="w-56">
                      <div className="flex items-center gap-2">
                        <Jauge
                          valeur={pct}
                          statut={
                            pct >= 0.8 ? 'termine' : pct >= 0.4 ? 'en_cours' : 'non_commence'
                          }
                          className="flex-1"
                        />
                        <span className="w-12 text-right text-xs tabular-nums">
                          {formatPercent(pct)}
                        </span>
                      </div>
                    </td>
                    <td className="tabular-nums">
                      {p.modules_termines}/{p.modules_total}
                    </td>
                    <td className="tabular-nums">{formatPercent(p.score_quiz_moyen)}</td>
                    <td>
                      {p.certificat_code ? (
                        <span className="font-mono text-xs text-bo-menthe">
                          {p.certificat_code}
                        </span>
                      ) : p.eligible ? (
                        <span className="bo-puce !border-bo-menthe/40 !text-bo-menthe">
                          {fr.backoffice.eligibles}
                        </span>
                      ) : (
                        <span className="bo-doux">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
