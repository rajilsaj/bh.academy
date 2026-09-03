'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { staff, trainerProfiles } from '@/lib/db/schema'

const BASE = '/admin/profil'
const champ = (f: FormData, nom: string) => String(f.get(nom) ?? '').trim()
const ouNull = (s: string) => (s ? s : null)

/** Chacun complète son propre profil ; créé à la première sauvegarde. */
export async function enregistrerProfil(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) redirect('/admin/login')
  const fullName = champ(formData, 'fullName')
  if (!fullName) redirect(`${BASE}?e=manquant`)
  const valeurs = {
    fullName,
    bio: ouNull(champ(formData, 'bio')),
    phone: ouNull(champ(formData, 'phone')),
    linkedin: ouNull(champ(formData, 'linkedin')),
    website: ouNull(champ(formData, 'website')),
    linktree: ouNull(champ(formData, 'linktree')),
    socials: ouNull(champ(formData, 'socials')),
  }
  await db
    .insert(trainerProfiles)
    .values({ staffId: session.user.id, ...valeurs, confirmedAt: new Date() })
    .onConflictDoUpdate({ target: trainerProfiles.staffId, set: valeurs })
  revalidatePath(BASE)
  redirect(`${BASE}?ok=profil`)
}

export async function changerMotDePasse(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) redirect('/admin/login')
  const a = champ(formData, 'password')
  const b = champ(formData, 'confirm')
  if (a.length < 8) redirect(`${BASE}?e=court`)
  if (a !== b) redirect(`${BASE}?e=differents`)
  await db.update(staff).set({ passwordHash: await bcrypt.hash(a, 10) }).where(eq(staff.id, session.user.id))
  redirect(`${BASE}?ok=motDePasse`)
}
