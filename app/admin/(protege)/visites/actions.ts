'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth'
import { purgerVisites, supprimerVisiteur } from '@/lib/visites'

const BASE = '/admin/visites'

export async function effacerVisiteur(formData: FormData) {
  const session = await requirePermission('voirVisites')
  if (!session) redirect('/admin')
  const id = String(formData.get('visitorId') ?? '').trim()
  if (!/^[0-9a-f-]{36}$/.test(id)) redirect(BASE)
  await supprimerVisiteur(id)
  revalidatePath(BASE)
  redirect(`${BASE}?ok=visiteurSupprime`)
}

export async function purger(formData: FormData) {
  const session = await requirePermission('voirVisites')
  if (!session) redirect('/admin')
  const jours = Number.parseInt(String(formData.get('jours') ?? '90'), 10)
  const n = await purgerVisites(Number.isFinite(jours) && jours > 0 ? jours : 90)
  revalidatePath(BASE)
  redirect(`${BASE}?ok=purge&n=${n}`)
}
