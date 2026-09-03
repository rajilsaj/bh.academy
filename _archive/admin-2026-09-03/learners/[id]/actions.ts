'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { KIT_ITEMS, learnerKit, outcomes, OUTCOME_TYPES, type KitItem, type OutcomeType } from '@/lib/db/schema'
import { requirePermission } from '@/lib/auth'

/**
 * Les résultats forment un journal d'événements : on ajoute, on ne modifie pas
 * un statut. Le taux d'insertion à 3 et 6 mois se lit dans cette table.
 */
export async function ajouterResultat(formData: FormData) {
  const session = await requirePermission('gererResultats')
  if (!session) redirect('/admin')

  const learnerId = String(formData.get('learnerId') ?? '')
  const outcomeType = String(formData.get('outcomeType') ?? '') as OutcomeType
  const occurredOn = String(formData.get('occurredOn') ?? '')
  const detail = String(formData.get('detail') ?? '').trim()

  const back = `/admin/learners/${learnerId}`
  if (!learnerId || !OUTCOME_TYPES.includes(outcomeType) || !occurredOn) {
    redirect(`${back}?e=manquant`)
  }

  await db.insert(outcomes).values({
    learnerId,
    outcomeType,
    occurredOn,
    detail: detail || null,
  })

  revalidatePath(back)
  revalidatePath('/admin')
  redirect(`${back}?ok=1`)
}

/** Le kit remis : on remplace l'état par ce qui est coché. */
export async function enregistrerKit(formData: FormData) {
  const session = await requirePermission('gererSessions')
  if (!session) redirect('/admin')
  const learnerId = String(formData.get('learnerId') ?? '')
  if (!learnerId) redirect('/admin')
  const coches = formData
    .getAll('item')
    .map(String)
    .filter((i): i is KitItem => (KIT_ITEMS as readonly string[]).includes(i))
  await db.delete(learnerKit).where(eq(learnerKit.learnerId, learnerId))
  if (coches.length > 0) await db.insert(learnerKit).values(coches.map((item) => ({ learnerId, item })))
  const back = `/admin/learners/${learnerId}`
  revalidatePath(back)
  redirect(`${back}?ok=kit`)
}
