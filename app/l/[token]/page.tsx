import Link from 'next/link'
import { Bloc, LearnerShell, LienInvalide } from '@/components/LearnerShell'
import { fr } from '@/lib/i18n/fr'
import { getLearnerByToken, getLearnerProgress, getPendingAction } from '@/lib/queries'
import { formatDate, formatPercent } from '@/lib/format'

export const dynamic = 'force-dynamic'

/**
 * Aiguilleur : une seule action visible, un seul gros bouton.
 * Jamais de menu — l'apprenant ne doit pas avoir à choisir.
 * Le lien vers « mon parcours » reste discret, en second plan.
 */
export default async function LearnerHome({ params }: { params: { token: string } }) {
  const learner = await getLearnerByToken(params.token)
  if (!learner) return <LienInvalide />

  const [action, progression] = await Promise.all([
    getPendingAction(learner),
    getLearnerProgress(learner.id),
  ])

  const base = `/l/${learner.token}`
  const prenom = learner.fullName.split(' ')[0]

  let href = `${base}/documents`
  let libelle: string = fr.learner.documents.bouton
  let contexte: string | null = null

  if (action.kind === 'presence') {
    href = `${base}/presence`
    libelle = fr.learner.presence.bouton
    contexte = `${action.session.moduleName} — ${formatDate(action.session.heldOn)}`
  } else if (action.kind === 'quiz') {
    href = `${base}/quiz/${action.quizId}`
    libelle = fr.learner.quiz.commencer
    contexte = action.title
  } else if (action.kind === 'suivi') {
    href = `${base}/suivi/${action.waveCode}`
    libelle = fr.learner.suivi.bouton
    contexte = action.label
  }

  const avancement = progression?.avancement ? Number(progression.avancement) : 0

  return (
    <LearnerShell parcoursHref={`${base}/parcours`}>
      <p className="text-lg text-white/90">
        {fr.learner.bonjour} <strong className="titre text-white">{prenom}</strong>
      </p>
      <p className="mt-0.5 text-sm text-white/55">{learner.id}</p>

      {action.kind === 'rien' ? (
        <Bloc className="mt-7">
          <p className="titre text-xl">{fr.learner.rienAFaire}</p>
          <p className="mt-2 text-sm text-slate-600">{fr.learner.rienAFaireDetail}</p>
        </Bloc>
      ) : (
        <div className="mt-7">
          {contexte ? (
            <p className="mb-3 text-center text-sm text-white/80">{contexte}</p>
          ) : null}
          <Link href={href} className="bouton-principal">
            {libelle}
            <span className="fleche" aria-hidden="true">
              ↗
            </span>
          </Link>
        </div>
      )}

      {/* Rappel d'avancement : informatif, jamais une deuxième action. */}
      {progression ? (
        <Link href={`${base}/parcours`} className="mt-8 block">
          <div className="carte-violette">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-white/80">{fr.parcours.avancementGlobal}</span>
              <span className="titre text-2xl text-vitrine-jaune">
                {formatPercent(avancement)}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/20">
              <span
                className="block h-full rounded-full bg-vitrine-turquoise"
                style={{ width: `${Math.round(avancement * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-white/60">
              {progression.modules_termines}/{progression.modules_total}{' '}
              {fr.parcours.modulesTermines}
            </p>
          </div>
        </Link>
      ) : null}

      {/* Les supports de cours : un lien discret, jamais une deuxième action. */}
      <p className="mt-4 text-center">
        <Link href={`${base}/ressources`} className="text-sm text-white/80 underline">
          {fr.learner.ressources.lien}
        </Link>
      </p>
    </LearnerShell>
  )
}
