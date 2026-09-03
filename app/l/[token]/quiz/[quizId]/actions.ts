'use server'

import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { quizAttempts } from '@/lib/db/schema'
import { getLearnerByToken, getQuizWithQuestions } from '@/lib/queries'
import { crediterQuiz } from '@/lib/points'

/**
 * Une question par écran, sans JavaScript : les réponses déjà données voyagent
 * dans l'URL (`?q=2&a=0,3`). Aucun état serveur intermédiaire, donc aucune
 * session à perdre quand la connexion coupe entre deux questions.
 */
export async function repondreQuestion(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  const quizId = String(formData.get('quizId') ?? '')
  const index = Number(formData.get('index') ?? 0)
  const acc = String(formData.get('acc') ?? '')
  const choice = formData.get('choice')

  const learner = await getLearnerByToken(token)
  if (!learner) redirect('/')

  const base = `/l/${learner.token}/quiz/${quizId}`
  function back(query: string): never {
    redirect(query ? `${base}?${query}` : base)
  }

  const loaded = await getQuizWithQuestions(quizId)
  if (!loaded) back('')

  const { quiz, questions } = loaded
  const previous = acc ? acc.split(',').filter((v) => v !== '') : []

  // Index incohérent (retour arrière, double soumission) : on repart proprement.
  if (!Number.isInteger(index) || index < 0 || index >= questions.length || previous.length !== index) {
    back('')
  }

  const answer = Number(choice)
  if (!Number.isInteger(answer) || answer < 0) back(`q=${index}&a=${previous.join(',')}`)

  const answers = [...previous, String(answer)]

  if (answers.length < questions.length) {
    back(`q=${answers.length}&a=${answers.join(',')}`)
  }

  const payload: Record<string, number> = {}
  let score = 0
  questions.forEach((question, i) => {
    const given = Number(answers[i])
    payload[String(question.position)] = given
    if (given === question.correctIndex) score += 1
  })

  await db
    .insert(quizAttempts)
    .values({
      learnerId: learner.id,
      quizId,
      score,
      maxScore: questions.length,
      answers: payload,
    })
    .onConflictDoNothing()

  // Les points de quiz du module, au prorata du score : jamais bloquant.
  try {
    await crediterQuiz(learner, quiz, score, questions.length)
  } catch (erreur) {
    console.error('[points] quiz :', erreur)
  }

  back('fait=1')
}
