'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { waves } from '@/lib/db/schema'
import { requirePermission } from '@/lib/auth'

/**
 * Ouvrir/fermer une vague ne touche qu'à `opens_at` / `closes_at`.
 * Les niveaux se recalculent d'eux-mêmes : rien n'est écrit sur l'apprenant.
 */
export async function ouvrirVague(formData: FormData) {
  const session = await requirePermission('gererVagues')
  if (!session) redirect('/admin')

  const waveId = String(formData.get('waveId') ?? '')
  if (!waveId) redirect('/admin/waves')

  await db.update(waves).set({ opensAt: new Date(), closesAt: null }).where(eq(waves.id, waveId))

  revalidatePath('/admin/waves')
  revalidatePath('/admin')
  redirect('/admin/waves?ok=ouverte')
}

export async function fermerVague(formData: FormData) {
  const session = await requirePermission('gererVagues')
  if (!session) redirect('/admin')

  const waveId = String(formData.get('waveId') ?? '')
  if (!waveId) redirect('/admin/waves')

  const [wave] = await db.select().from(waves).where(eq(waves.id, waveId)).limit(1)
  if (!wave) redirect('/admin/waves')

  const now = new Date()
  await db
    .update(waves)
    .set({ opensAt: wave.opensAt ?? now, closesAt: now })
    .where(eq(waves.id, waveId))

  revalidatePath('/admin/waves')
  revalidatePath('/admin')
  redirect('/admin/waves?ok=fermee')
}
