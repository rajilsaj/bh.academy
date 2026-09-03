'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { sessions } from '@/lib/db/schema'
import { requirePermission } from '@/lib/auth'
import { generateDayCode } from '@/lib/ids'

/** Un code unique en base : on retente tant que le tirage entre en collision. */
async function uniqueDayCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateDayCode()
    const [taken] = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.dayCode, code))
      .limit(1)
    if (!taken) return code
  }
  throw new Error('Impossible de générer un code de session unique')
}

export async function creerSession(formData: FormData) {
  const session = await requirePermission('gererSessions')
  if (!session) redirect('/admin')

  const cohortId = String(formData.get('cohortId') ?? '')
  const moduleName = String(formData.get('moduleName') ?? '').trim()
  const heldOn = String(formData.get('heldOn') ?? '')
  const opensAt = String(formData.get('opensAt') ?? '')
  const closesAt = String(formData.get('closesAt') ?? '')

  if (!cohortId || !moduleName || !heldOn || !opensAt || !closesAt) {
    redirect('/admin/sessions?e=manquant')
  }

  await db.insert(sessions).values({
    cohortId,
    moduleName,
    heldOn,
    dayCode: await uniqueDayCode(),
    opensAt: new Date(opensAt),
    closesAt: new Date(closesAt),
  })

  revalidatePath('/admin/sessions')
  redirect('/admin/sessions?ok=creee')
}

export async function regenererCode(formData: FormData) {
  const session = await requirePermission('gererSessions')
  if (!session) redirect('/admin')

  const sessionId = String(formData.get('sessionId') ?? '')
  if (!sessionId) redirect('/admin/sessions')

  await db
    .update(sessions)
    .set({ dayCode: await uniqueDayCode() })
    .where(eq(sessions.id, sessionId))

  revalidatePath('/admin/sessions')
  redirect('/admin/sessions?ok=code')
}
