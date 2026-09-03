import Link from 'next/link'
import { LienInvalide } from '@/components/LearnerShell'
import { Jauge, StatutPuce } from '@/components/Progression'
import { fr } from '@/lib/i18n/fr'
import { formatDate, formatPercent } from '@/lib/format'
import {
  getCertificate,
  getLearnerByToken,
  getLearnerProgress,
  getModuleProgress,
} from '@/lib/queries'

export const dynamic = 'force-dynamic'

/**
 * Le tableau de bord de l'apprenant : où il en est, module par module, et son
 * certificat. Même langage visuel que le back-office du formateur — c'est le
 * même objet regardé des deux côtés.
 *
 * Aucune bibliothèque de graphiques : les jauges sont deux `div`, l'anneau un
 * SVG de quelques lignes. La page reste utilisable sans JavaScript.
 */
export default async function ParcoursPage({ params }: { params: { token: string } }) {
  const learner = await getLearnerByToken(params.token)
  if (!learner) return <LienInvalide />

  const [progression, modules, certificat] = await Promise.all([
    getLearnerProgress(learner.id),
    getModuleProgress(learner.id),
    getCertificate(learner.id),
  ])

  const base = `/l/${learner.token}`
  const avancement = progression?.avancement ? Number(progression.avancement) : 0
  const seancesSuivies = modules.reduce((n, m) => n + Number(m.seances_suivies), 0)
  const seancesTenues = modules.reduce((n, m) => n + Number(m.seances_tenues), 0)

  // Anneau de progression : circonférence d'un cercle de rayon 52.
  const rayon = 52
  const circonference = 2 * Math.PI * rayon

  return (
    <div className="bo px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{fr.parcours.titre}</h1>
            <p className="bo-doux mt-0.5">
              {learner.fullName} — {learner.id}
            </p>
          </div>
          <Link href={base} className="bo-bouton-discret">
            {fr.parcours.retourAccueil}
          </Link>
        </header>

        {/* ------------------------------------------------ avancement global */}
        <section className="bo-panneau">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative shrink-0 text-center">
              <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true">
                <circle
                  cx="66"
                  cy="66"
                  r={rayon}
                  fill="none"
                  stroke="#2A2A30"
                  strokeWidth="12"
                />
                <circle
                  cx="66"
                  cy="66"
                  r={rayon}
                  fill="none"
                  stroke="#86EFAC"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={circonference}
                  strokeDashoffset={circonference * (1 - avancement)}
                  transform="rotate(-90 66 66)"
                />
              </svg>
              {/* Le pourcentage se superpose à l'anneau ; le libellé va dessous. */}
              <div className="pointer-events-none absolute inset-x-0 top-0 grid h-[132px] place-items-center">
                <span className="text-2xl font-bold">{formatPercent(avancement)}</span>
              </div>
              <p className="bo-doux mt-2">{fr.parcours.avancementGlobal}</p>
            </div>

            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-2">
              <div className="bo-sous-panneau">
                <p className="bo-chiffre">
                  {progression?.modules_termines ?? 0}
                  <span className="text-base text-bo-doux">
                    /{progression?.modules_total ?? 0}
                  </span>
                </p>
                <p className="bo-doux mt-1">{fr.parcours.modulesTermines}</p>
              </div>
              <div className="bo-sous-panneau">
                <p className="bo-chiffre">
                  {seancesSuivies}
                  <span className="text-base text-bo-doux">/{seancesTenues}</span>
                </p>
                <p className="bo-doux mt-1">{fr.parcours.seancesSuivies}</p>
              </div>
              <div className="bo-sous-panneau">
                <p className="bo-chiffre">{formatPercent(progression?.score_quiz_moyen)}</p>
                <p className="bo-doux mt-1">{fr.parcours.scoreQuiz}</p>
              </div>
              <div className="bo-sous-panneau">
                <p className="bo-chiffre">{progression?.documents ?? 0}</p>
                <p className="bo-doux mt-1">{fr.parcours.documentsRendus}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- modules */}
        <section className="bo-panneau">
          <h2 className="bo-titre mb-4">{fr.parcours.modules}</h2>
          <ul className="space-y-3">
            {modules.map((m) => {
              const pct = m.avancement === null ? null : Number(m.avancement)
              return (
                <li key={m.module_name} className="bo-sous-panneau">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-bo-bordure text-xs font-bold">
                      {m.position}
                    </span>
                    <span className="flex-1 text-sm font-medium">{m.module_name}</span>
                    <StatutPuce statut={m.statut} />
                    <span className="w-14 text-right text-sm font-semibold tabular-nums">
                      {pct === null ? '—' : formatPercent(pct)}
                    </span>
                  </div>

                  <Jauge valeur={pct ?? 0} statut={m.statut} className="mt-3" />

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    <span className="bo-doux">
                      {fr.parcours.presence} {m.seances_suivies}/{m.seances_tenues}
                    </span>
                    {Number(m.quiz_prevus) > 0 ? (
                      <span className="bo-doux">
                        {fr.parcours.quiz} {m.quiz_faits}/{m.quiz_prevus}
                        {m.quiz_score ? ` — ${formatPercent(m.quiz_score)}` : ''}
                      </span>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        {/* ----------------------------------------------------- certificat */}
        <section className="bo-panneau">
          <h2 className="bo-titre mb-3">{fr.parcours.certificat}</h2>
          {certificat ? (
            <div className="rounded-xl border border-bo-menthe/30 bg-bo-menthe/10 p-4">
              <p className="font-semibold text-bo-menthe">{fr.parcours.certificatObtenu}</p>
              <p className="bo-doux mt-1">
                {fr.parcours.certificatLe} {formatDate(certificat.issuedOn)}
              </p>
              <p className="mt-2 font-mono text-sm tracking-wider">{certificat.code}</p>
              <Link href={`/certificat/${certificat.code}`} className="bo-bouton mt-4">
                {fr.parcours.certificatVoir}
              </Link>
            </div>
          ) : (
            <div className="bo-sous-panneau">
              <p className="text-sm font-medium text-bo-doux">
                {fr.parcours.certificatPasEncore}
              </p>
              <p className="mt-2 text-sm text-bo-doux">
                {avancement >= 0.8
                  ? fr.parcours.certificatEligible
                  : fr.parcours.certificatEnCours}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
