'use server'

import { randomBytes } from 'node:crypto'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { learners, ROLES, staff, trainerProfiles, type Role } from '@/lib/db/schema'
import { requirePermission } from '@/lib/auth'
import { appUrl } from '@/lib/config'
import { fr } from '@/lib/i18n/fr'
import { notifier, remplir } from '@/lib/notifications'
import { enregistrerPhotoFormateur, MAX_PHOTO_BYTES, photoAcceptee } from '@/lib/formateurs'

const BASE = '/admin/utilisateurs'
const champ = (f: FormData, nom: string) => String(f.get(nom) ?? '').trim()
const ouNull = (s: string) => (s ? s : null)

/** Le portrait du formulaire, rangé dans le stockage ; `undefined` si aucun fichier, `null` s'il est refusé. */
async function lirePhoto(formData: FormData, staffId: string): Promise<string | null | undefined> {
  const photo = formData.get('photo')
  if (!(photo instanceof File) || photo.size === 0) return undefined
  if (photo.size > MAX_PHOTO_BYTES || !photoAcceptee(photo.name)) return null
  return enregistrerPhotoFormateur(staffId, photo.name, Buffer.from(await photo.arrayBuffer()))
}

/** Envoie (ou met en attente) l'invitation d'un formateur ; renvoie le statut. */
async function inviter(staffId: string, email: string, nom: string, createdBy: string) {
  const token = randomBytes(24).toString('hex')
  await db
    .update(trainerProfiles)
    .set({ invitationToken: token, invitedAt: new Date(), confirmedAt: null })
    .where(eq(trainerProfiles.staffId, staffId))
  const lien = `${appUrl()}/formateur/${token}`
  const envoi = await notifier({
    channel: 'mail',
    recipient: email,
    recipientName: nom,
    subject: fr.formateur.invitationSujet,
    body: remplir(fr.formateur.invitationCorps, { nom, lien }),
    staffId,
    createdBy,
  })
  return envoi?.status ?? 'en_attente'
}

export async function creerCompte(formData: FormData) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) redirect('/admin')

  const email = champ(formData, 'email').toLowerCase()
  const role = champ(formData, 'role') as Role
  const motDePasse = champ(formData, 'password')
  const nom = champ(formData, 'fullName')
  if (!email || !ROLES.includes(role)) redirect(`${BASE}?e=manquant`)
  if (role !== 'formateur' && !motDePasse) redirect(`${BASE}?e=manquant`)
  if (role === 'formateur' && !nom) redirect(`${BASE}?e=manquant`)

  const [existe] = await db.select({ id: staff.id }).from(staff).where(eq(staff.email, email)).limit(1)
  if (existe) redirect(`${BASE}?e=emailPris`)

  // Sans mot de passe, un aléa inconnu de tous : seul le lien d'invitation ouvre le compte.
  const hash = await bcrypt.hash(motDePasse || randomBytes(32).toString('hex'), 10)
  const [compte] = await db.insert(staff).values({ email, passwordHash: hash, role }).returning()

  let ok = 'cree'
  if (role === 'formateur') {
    const photoPath = await lirePhoto(formData, compte.id)
    if (photoPath === null) {
      await db.delete(staff).where(eq(staff.id, compte.id))
      redirect(`${BASE}?e=photo`)
    }
    await db.insert(trainerProfiles).values({
      staffId: compte.id,
      fullName: nom,
      photoPath: photoPath ?? null,
      phone: ouNull(champ(formData, 'phone')),
      linkedin: ouNull(champ(formData, 'linkedin')),
      facebook: ouNull(champ(formData, 'facebook')),
      website: ouNull(champ(formData, 'website')),
      linktree: ouNull(champ(formData, 'linktree')),
      socials: ouNull(champ(formData, 'socials')),
      confirmedAt: motDePasse ? new Date() : null,
    })
    if (!motDePasse) {
      const statut = await inviter(compte.id, email, nom, session.user.id)
      ok = statut === 'envoye' ? 'invite' : 'inviteEnAttente'
    }
  }

  revalidatePath(BASE)
  redirect(`${BASE}?ok=${ok}`)
}

export async function renvoyerInvitation(formData: FormData) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) redirect('/admin')
  const staffId = champ(formData, 'staffId')
  const [compte] = await db
    .select({ id: staff.id, email: staff.email, nom: trainerProfiles.fullName })
    .from(staff)
    .innerJoin(trainerProfiles, eq(trainerProfiles.staffId, staff.id))
    .where(eq(staff.id, staffId))
    .limit(1)
  if (!compte) redirect(BASE)
  const statut = await inviter(compte.id, compte.email, compte.nom, session.user.id)
  revalidatePath(BASE)
  redirect(`${BASE}?ok=${statut === 'envoye' ? 'renvoye' : 'inviteEnAttente'}`)
}

/** La fiche vitrine d'un formateur : nom, présentation, réseaux, portrait. */
export async function modifierFormateur(formData: FormData) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) redirect('/admin')
  const staffId = champ(formData, 'staffId')
  const fullName = champ(formData, 'fullName')
  if (!staffId || !fullName) redirect(`${BASE}?e=manquant`)
  const photoPath = await lirePhoto(formData, staffId)
  if (photoPath === null) redirect(`${BASE}?fiche=${staffId}&e=photo`)
  await db
    .update(trainerProfiles)
    .set({
      fullName,
      bio: ouNull(champ(formData, 'bio')),
      linkedin: ouNull(champ(formData, 'linkedin')),
      facebook: ouNull(champ(formData, 'facebook')),
      website: ouNull(champ(formData, 'website')),
      ...(photoPath ? { photoPath } : {}),
    })
    .where(eq(trainerProfiles.staffId, staffId))
  revalidatePath(BASE)
  revalidatePath('/')
  redirect(`${BASE}?ok=formateurModifie`)
}

export async function changerRole(formData: FormData) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) redirect('/admin')
  const staffId = champ(formData, 'staffId')
  const role = champ(formData, 'role') as Role
  if (!staffId || !ROLES.includes(role)) redirect(`${BASE}?e=manquant`)
  await db.update(staff).set({ role }).where(eq(staff.id, staffId))
  revalidatePath(BASE)
  redirect(`${BASE}?ok=role`)
}

export async function reinitialiserMotDePasse(formData: FormData) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) redirect('/admin')
  const staffId = champ(formData, 'staffId')
  const motDePasse = champ(formData, 'password')
  if (!staffId || motDePasse.length < 8) redirect(`${BASE}?e=manquant`)
  await db.update(staff).set({ passwordHash: await bcrypt.hash(motDePasse, 10) }).where(eq(staff.id, staffId))
  await db.update(trainerProfiles).set({ confirmedAt: new Date(), invitationToken: null }).where(eq(trainerProfiles.staffId, staffId))
  revalidatePath(BASE)
  redirect(`${BASE}?ok=motDePasse`)
}

export async function supprimerCompte(formData: FormData) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) redirect('/admin')
  const staffId = champ(formData, 'staffId')
  if (!staffId) redirect(BASE)
  if (staffId === session.user.id) redirect(`${BASE}?e=soiMeme`)
  await db.delete(staff).where(eq(staff.id, staffId))
  revalidatePath(BASE)
  redirect(`${BASE}?ok=supprime`)
}

export async function modifierApprenant(formData: FormData) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) redirect('/admin')
  const learnerId = champ(formData, 'learnerId')
  const fullName = champ(formData, 'fullName')
  const cohortId = champ(formData, 'cohortId')
  if (!learnerId || !fullName || !cohortId) redirect(`${BASE}?e=manquant`)
  await db
    .update(learners)
    .set({
      fullName,
      cohortId,
      phone: ouNull(champ(formData, 'phone')),
      email: ouNull(champ(formData, 'email').toLowerCase()),
    })
    .where(eq(learners.id, learnerId))
  revalidatePath(BASE)
  redirect(`${BASE}?ok=apprenantModifie`)
}

export async function supprimerApprenant(formData: FormData) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) redirect('/admin')
  const learnerId = champ(formData, 'learnerId')
  if (!learnerId) redirect(BASE)
  await db.delete(learners).where(eq(learners.id, learnerId))
  revalidatePath(BASE)
  revalidatePath('/admin')
  redirect(`${BASE}?ok=apprenantSupprime`)
}
