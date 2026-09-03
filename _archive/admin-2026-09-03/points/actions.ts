'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { MODULE_DECISIONS, moduleDecisions, type ModuleDecision } from '@/lib/db/schema'
import { requirePermission } from '@/lib/auth'
import { crediter } from '@/lib/points'

const BASE = '/admin/points'
const champ = (f: FormData, nom: string) => String(f.get(nom) ?? '').trim()

export async function crediterManuel(formData: FormData) {
  const session = await requirePermission('gererPoints')
  if (!session) redirect('/admin')
  const learnerId = champ(formData, 'learnerId')
  const moduleId = champ(formData, 'moduleId')
  const points = Number.parseInt(champ(formData, 'points'), 10)
  const note = champ(formData, 'note')
  const cohorte = champ(formData, 'cohorte')
  const retour = cohorte ? `${BASE}?cohorte=${cohorte}` : BASE
  if (!learnerId || !moduleId || !Number.isFinite(points) || points === 0) redirect(`${retour}&e=manquant`)
  await crediter({ learnerId, moduleId, source: 'manuel', points, note: note || null, createdBy: session.user.id })
  revalidatePath(BASE)
  redirect(`${retour}&ok=credite`)
}

/** « À refaire » ou « exclu » : une décision humaine, qui prime sur le calcul. */
export async function decider(formData: FormData) {
  const session = await requirePermission('gererPoints')
  if (!session) redirect('/admin')
  const learnerId = champ(formData, 'learnerId')
  const moduleId = champ(formData, 'moduleId')
  const decision = champ(formData, 'decision')
  const note = champ(formData, 'note')
  const cohorte = champ(formData, 'cohorte')
  const retour = cohorte ? `${BASE}?cohorte=${cohorte}` : BASE
  if (!learnerId || !moduleId) redirect(`${retour}&e=manquant`)

  if (decision === 'auto') {
    await db.delete(moduleDecisions).where(and(eq(moduleDecisions.learnerId, learnerId), eq(moduleDecisions.moduleId, moduleId)))
  } else {
    if (!MODULE_DECISIONS.includes(decision as ModuleDecision)) redirect(`${retour}&e=manquant`)
    await db
      .insert(moduleDecisions)
      .values({ learnerId, moduleId, decision: decision as ModuleDecision, note: note || null, decidedBy: session.user.id })
      .onConflictDoUpdate({
        target: [moduleDecisions.learnerId, moduleDecisions.moduleId],
        set: { decision: decision as ModuleDecision, note: note || null, decidedBy: session.user.id, decidedAt: new Date() },
      })
  }
  revalidatePath(BASE)
  redirect(`${retour}&ok=decide`)
}
