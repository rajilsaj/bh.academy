import Link from 'next/link'
import { and, eq } from 'drizzle-orm'
import { Alerte, Bloc, LearnerShell, LienInvalide } from '@/components/LearnerShell'
import { db } from '@/lib/db'
import { quizAttempts } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { getLearnerByToken, getQuizWithQuestions } from '@/lib/queries'
import { repondreQuestion } from './actions'

export const dynamic = 'force-dynamic'

export default async function QuizPage({
  params,
  searchParams,
}: {
  params: { token: string; quizId: string }
  searchParams: { q?: string; a?: string; fait?: string }
}) {
  const learner = await getLearnerByToken(params.token)
  if (!learner) return <LienInvalide />

  const base = `/l/${learner.token}`
  const loaded = await getQuizWithQuestions(params.quizId)
  if (!loaded) return <LienInvalide />
  const { quiz, questions } = loaded

  const [attempt] = await db
    .select()
    .from(quizAttempts)
    .where(and(eq(quizAttempts.learnerId, learner.id), eq(quizAttempts.quizId, quiz.id)))
    .limit(1)

  // Score immédiat : c'est le seul retour attendu, pas de classement ni de chrono.
  if (attempt) {
    return (
      <LearnerShell title={fr.learner.quiz.resultat} backHref={base}>
        <Bloc className="text-center">
          <p className="text-sm text-slate-600">{quiz.title}</p>
          <p className="titre mt-3 text-6xl text-vitrine-violet">
            {attempt.score}
            <span className="text-3xl text-slate-400">/{attempt.maxScore}</span>
          </p>
          <p className="mt-2 text-sm text-slate-600">{fr.learner.quiz.points}</p>
        </Bloc>
        {searchParams.fait !== '1' ? (
          <p className="mt-4 text-sm text-white/70">{fr.learner.quiz.dejaFait}</p>
        ) : null}
      </LearnerShell>
    )
  }

  if (questions.length === 0) return <LienInvalide />

  const acc = (searchParams.a ?? '').split(',').filter((v) => v !== '')
  const index = Number.isInteger(Number(searchParams.q)) ? Number(searchParams.q) : 0
  const coherent = index >= 0 && index < questions.length && acc.length === index

  if (!coherent && index !== 0) {
    return (
      <LearnerShell title={quiz.title} backHref={base}>
        <Alerte>{fr.app.erreurGenerique}</Alerte>
        <Link href={`${base}/quiz/${quiz.id}`} className="bouton-principal mt-4">
          {fr.learner.quiz.commencer}
        </Link>
      </LearnerShell>
    )
  }

  const current = questions[index]
  const progression = Math.round(((index + 1) / questions.length) * 100)

  return (
    <LearnerShell title={quiz.title} backHref={base}>
      {/* Barre d'avancement du quiz : rassure sur ce qu'il reste à faire. */}
      <div className="mb-5">
        <p className="mb-2 text-sm text-white/75">
          {fr.learner.quiz.question} {index + 1} {fr.learner.quiz.sur} {questions.length}
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
          <span
            className="block h-full rounded-full bg-vitrine-jaune"
            style={{ width: `${progression}%` }}
          />
        </div>
      </div>

      <Bloc>
        <form action={repondreQuestion}>
          <input type="hidden" name="token" value={learner.token} />
          <input type="hidden" name="quizId" value={quiz.id} />
          <input type="hidden" name="index" value={index} />
          <input type="hidden" name="acc" value={acc.join(',')} />

          <fieldset>
            <legend className="titre mb-4 text-xl">{current.prompt}</legend>
            <div className="space-y-2">
              {current.options.map((option, i) => (
                <label key={i} className="option">
                  <input
                    type="radio"
                    name="choice"
                    value={i}
                    required
                    className="h-5 w-5 shrink-0 accent-vitrine-violet"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <button type="submit" className="bouton-principal mt-6">
            {index + 1 === questions.length ? fr.learner.quiz.terminer : fr.learner.quiz.suivant}
            <span className="fleche" aria-hidden="true">
              ↗
            </span>
          </button>
        </form>
      </Bloc>
    </LearnerShell>
  )
}
