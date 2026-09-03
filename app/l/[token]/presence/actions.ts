'use server'

import { redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { attendance, sessions } from '@/lib/db/schema'
import { getLearnerByToken } from '@/lib/queries'
import { crediterPresence } from '@/lib/points'

export type PresenceError = 'inconnu' | 'ferme' | 'pasEncore' | 'autreCohorte' | 'deja'

export async function marquerPresence(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  const code = String(formData.get('code') ?? '')
    .trim()
    .toUpperCase()

  const learner = await getLearnerByToken(token)
  if (!learner) redirect('/')

  const base = `/l/${learner.token}/presence`
  function back(query: string): never {
    redirect(`${base}?${query}`)
  }

  if (code.length !== 6) back('e=inconnu')

  const [session] = await db.select().from(sessions).where(eq(sessions.dayCode, code)).limit(1)

  if (!session) back('e=inconnu')
  if (session.cohortId !== learner.cohortId) back('e=autreCohorte')

  const now = Date.now()
  if (now < session.opensAt.getTime()) back('e=pasEncore')
  if (now > session.closesAt.getTime()) back('e=ferme')

  const [existing] = await db
    .select({ learnerId: attendance.learnerId })
    .from(attendance)
    .where(and(eq(attendance.learnerId, learner.id), eq(attendance.sessionId, session.id)))
    .limit(1)

  if (existing) back(`e=deja&s=${session.id}`)

  await db
    .insert(attendance)
    .values({ learnerId: learner.id, sessionId: session.id })
    .onConflictDoNothing()

  // Les points de présence du module : jamais bloquant pour l'apprenant.
  try {
    await crediterPresence(learner, session)
  } catch (erreur) {
    console.error('[points] présence :', erreur)
  }

  back(`ok=1&s=${session.id}`)
}
