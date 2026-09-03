'use server'

import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { staff, trainerProfiles } from '@/lib/db/schema'

/** Le formateur choisit son mot de passe : le compte est confirmé, le lien meurt. */
export async function confirmerCompte(formData: FormData) {
  const token = String(formData.get('token') ?? '').trim()
  const a = String(formData.get('password') ?? '')
  const b = String(formData.get('confirm') ?? '')
  const base = `/formateur/${token}`
  if (!/^[a-f0-9]{48}$/.test(token)) redirect('/admin/login')
  if (a.length < 8) redirect(`${base}?e=court`)
  if (a !== b) redirect(`${base}?e=differents`)

  const [profil] = await db.select().from(trainerProfiles).where(eq(trainerProfiles.invitationToken, token)).limit(1)
  if (!profil) redirect(`${base}?e=invalide`)

  await db.update(staff).set({ passwordHash: await bcrypt.hash(a, 10) }).where(eq(staff.id, profil.staffId))
  await db
    .update(trainerProfiles)
    .set({ confirmedAt: new Date(), invitationToken: null })
    .where(eq(trainerProfiles.staffId, profil.staffId))
  redirect('/admin/login?ok=confirme')
}
