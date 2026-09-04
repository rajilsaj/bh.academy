'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { programModules, RESOURCE_KINDS, resources, type ResourceKind } from '@/lib/db/schema'
import { requirePermission } from '@/lib/auth'
import { enregistrerFichierRessource, extensionAcceptee, MAX_RESOURCE_BYTES } from '@/lib/ressources'

const BASE = '/admin/ressources'
const champ = (f: FormData, nom: string) => String(f.get(nom) ?? '').trim()

/** Un formateur ne touche qu'aux modules qui lui sont attribués. */
async function moduleAutorise(moduleId: string, userId: string, role: string | undefined) {
  const [m] = await db.select().from(programModules).where(eq(programModules.id, moduleId)).limit(1)
  if (!m) return null
  if (role === 'formateur' && m.trainerId !== userId) return null
  return m
}

export async function ajouterRessource(formData: FormData) {
  const session = await requirePermission('gererRessources')
  if (!session) redirect('/admin')

  const moduleId = champ(formData, 'moduleId')
  const kind = champ(formData, 'kind') as ResourceKind
  const title = champ(formData, 'title')
  const url = champ(formData, 'url')
  const points = Number.parseInt(champ(formData, 'points') || '5', 10)
  const fichier = formData.get('fichier')
  const retour = `${BASE}?module=${moduleId}`

  if (!moduleId || !title || !RESOURCE_KINDS.includes(kind)) redirect(`${retour}&e=manquant`)
  const m = await moduleAutorise(moduleId, session.user.id, session.user.role)
  if (!m) redirect(BASE)

  let path: string | null = null
  if (fichier instanceof File && fichier.size > 0) {
    if (fichier.size > MAX_RESOURCE_BYTES || !extensionAcceptee(fichier.name)) redirect(`${retour}&e=fichier`)
    path = await enregistrerFichierRessource(moduleId, fichier.name, Buffer.from(await fichier.arrayBuffer()))
  }
  if (!url && !path) redirect(`${retour}&e=manquant`)

  await db.insert(resources).values({
    moduleId,
    trainerId: session.user.id,
    kind,
    title,
    url: url || null,
    path,
    points: Number.isFinite(points) ? Math.max(0, points) : m.pointsRessource,
  })
  revalidatePath(BASE)
  redirect(`${retour}&ok=ajoutee`)
}

export async function supprimerRessource(formData: FormData) {
  const session = await requirePermission('gererRessources')
  if (!session) redirect('/admin')
  const id = champ(formData, 'resourceId')
  const [r] = await db.select().from(resources).where(eq(resources.id, id)).limit(1)
  if (!r) redirect(BASE)
  const m = await moduleAutorise(r.moduleId, session.user.id, session.user.role)
  if (!m) redirect(BASE)
  await db.delete(resources).where(eq(resources.id, id))
  revalidatePath(BASE)
  redirect(`${BASE}?module=${r.moduleId}&ok=supprimee`)
}
