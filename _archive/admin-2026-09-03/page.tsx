import Link from 'next/link'
import { asc } from 'drizzle-orm'
import { AccesRefuse } from '@/components/AccesRefuse'
import { Histogramme, Jauge } from '@/components/Progression'
import { can, requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { cohorts, LEVELS } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { formatDate, formatPercent } from '@/lib/format'
import {
  getCohortProgress,
  getIndicators,
  getLevelCounts,
  getModulesOverview,
  getProgressDistribution,
} from '@/lib/queries'

export const dynamic = 'force-dynamic'

/** Teinte de niveau, en dur nulle part ailleurs. */
const POINT_NIVEAU: Record<string, string> = {
  Vert: 'bg-niveau-vert',
  Orange: 'bg-niveau-orange',
  Rouge: 'bg-niveau-rouge',
  Bleu: 'bg-niveau-bleu',
}

export default async function BackOffice() {
  const session = await requirePermission('voirTableauBord')
  if (!session) return <AccesRefuse />

  const [cohorte] = await db.select().from(cohorts).orderBy(asc(cohorts.startsOn)).limit(1)
  const [niveaux, indicateurs, modules, tranches, progression] = await Promise.all([
    getLevelCounts(cohorte?.id),
    getIndicators(cohorte?.id),
    getModulesOverview(cohorte?.id),
    getProgressDistribution(cohorte?.id),
    getCohortProgress(cohorte?.id),
  ])

  const effectif = LEVELS.reduce((n, l) => n + niveaux[l], 0)
  const presence =
    indicateurs.find((i) => i.metric === 'taux_presence_global')?.value ?? null
  const avancementMoyen =
    progression.length > 0
      ? progression.reduce((n, p) => n + Number(p.avancement ?? 0), 0) / progression.length
      : 0
  const certificatsDelivres = progression.filter((p) => p.certificat_code).length
  const eligibles = progression.filter((p) => p.eligible && !p.certificat_code).length
  const seancesCumulees = modules.reduce((n, m) => n + Number(m.seances_tenues), 0)

  // Les apprenants les plus en retard : c'est là que le formateur doit agir.
  const aSuivre = [...progression]
    .filter((p) => p.avancement !== null)
    .sort((a, b) => Number(a.avancement) - Number(b.avancement))
    .slice(0, 8)

  return (
    <div className="space-y-4">
      {/* -------------------------------------------------- bandeau chiffres */}
      <section className="grid gap-4 lg:grid-cols-4">
        <div className="bo-panneau lg:col-span-2">
          <p className="bo-doux">{fr.backoffice.promotionEnCours}</p>
          <p className="mt-1 text-lg font-semibold">{cohorte?.name ?? fr.app.aucuneDonnee}</p>
          {cohorte ? (
            <p className="bo-doux mt-1">
              {formatDate(cohorte.startsOn)} → {formatDate(cohorte.endsOn)} · {effectif}{' '}
              {fr.admin.dashboard.effectif.toLowerCase()}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            {LEVELS.map((niveau) => (
              <span key={niveau} className="bo-puce">
                <span
                  className={`h-2 w-2 rounded-full ${POINT_NIVEAU[niveau]}`}
                  aria-hidden="true"
                />
                {fr.niveaux[niveau]} <strong className="text-bo-texte">{niveaux[niveau]}</strong>
              </span>
            ))}
          </div>
        </div>

        <div className="bo-panneau">
          <p className="bo-doux">{fr.backoffice.avancementMoyen}</p>
          <p className="bo-chiffre mt-1">{formatPercent(avancementMoyen)}</p>
          <Jauge valeur={avancementMoyen} statut="termine" className="mt-3" />
          <p className="bo-doux mt-3">
            {fr.backoffice.tauxAssiduite} {formatPercent(presence)} ·{' '}
            {seancesCumulees} {fr.backoffice.seances}
          </p>
        </div>

        <div className="bo-panneau">
          <p className="bo-doux">{fr.backoffice.certificatsDelivres}</p>
          <p className="bo-chiffre mt-1">
            {certificatsDelivres}
            <span className="text-base text-bo-doux">/{effectif}</span>
          </p>
          <p className="mt-3 text-sm text-bo-menthe">
            {eligibles} {fr.backoffice.eligibles}
          </p>
          {can(session.user.role, 'gererResultats') ? (
            <Link href="/admin/certificats" className="bo-bouton-discret mt-3">
              {fr.backoffice.certificats}
            </Link>
          ) : null}
        </div>
      </section>

      {/* ----------------------------------- modules + répartition avancement */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="bo-panneau lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="bo-titre">{fr.backoffice.avancementParModule}</h2>
            <Link href="/admin/modules" className="bo-doux underline">
              {fr.backoffice.voirTout}
            </Link>
          </div>

          <ul className="space-y-3">
            {modules.map((m) => {
              const moyenne = m.avancement_moyen ? Number(m.avancement_moyen) : 0
              return (
                <li key={m.module_name}>
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-bo-panneau-2 text-[11px] font-bold text-bo-doux">
                      {m.position}
                    </span>
                    <span className="flex-1 truncate text-sm">{m.module_name}</span>
                    <span className="bo-doux tabular-nums">
                      {m.termine_par}/{m.effectif}
                    </span>
                    <span className="w-14 text-right text-sm font-semibold tabular-nums">
                      {formatPercent(moyenne)}
                    </span>
                  </div>
                  <Jauge
                    valeur={moyenne}
                    statut={moyenne >= 0.8 ? 'termine' : moyenne >= 0.4 ? 'en_cours' : 'non_commence'}
                    className="mt-2"
                  />
                </li>
              )
            })}
          </ul>
        </div>

        <div className="bo-panneau">
          <h2 className="bo-titre mb-4">{fr.backoffice.repartitionAvancement}</h2>
          <Histogramme tranches={tranches} />
        </div>
      </section>

      {/* ------------------------------------------------- apprenants à suivre */}
      <section className="bo-panneau">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="bo-titre">{fr.backoffice.apprenantsSuivre}</h2>
          {can(session.user.role, 'voirRelance') ? (
            <Link href="/admin/relance" className="bo-bouton-discret">
              {fr.admin.dashboard.voirRelance}
            </Link>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="bo-tableau">
            <thead>
              <tr>
                <th>{fr.backoffice.colonneApprenant}</th>
                <th>{fr.backoffice.colonneAvancement}</th>
                <th>{fr.backoffice.colonneModules}</th>
                <th>{fr.backoffice.colonneQuiz}</th>
                <th>{fr.backoffice.colonneNiveau}</th>
                <th>{fr.backoffice.colonneCertificat}</th>
              </tr>
            </thead>
            <tbody>
              {aSuivre.map((p) => {
                const pct = Number(p.avancement ?? 0)
                return (
                  <tr key={p.learner_id}>
                    <td>
                      <Link href={`/admin/learners/${p.learner_id}`} className="hover:underline">
                        {p.full_name}
                      </Link>
                      <span className="bo-doux block">{p.learner_id}</span>
                    </td>
                    <td className="w-48">
                      <div className="flex items-center gap-2">
                        <Jauge
                          valeur={pct}
                          statut={pct >= 0.8 ? 'termine' : pct >= 0.4 ? 'en_cours' : 'non_commence'}
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
                      <span className="bo-puce">
                        <span
                          className={`h-2 w-2 rounded-full ${POINT_NIVEAU[p.level]}`}
                          aria-hidden="true"
                        />
                        {fr.niveaux[p.level]}
                      </span>
                    </td>
                    <td>
                      {p.certificat_code ? (
                        <span className="font-mono text-xs text-bo-menthe">
                          {p.certificat_code}
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
