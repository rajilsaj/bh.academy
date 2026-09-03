'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { and, eq, inArray, sql as raw } from 'drizzle-orm'
import { db } from '@/lib/db'
import { cohorts, programModules, programs } from '@/lib/db/schema'
import { requirePermission } from '@/lib/auth'
import { genererObjectifs } from '@/lib/objectifs'

const BASE = '/admin/modules'
const champ = (f: FormData, nom: string) => String(f.get(nom) ?? '').trim()
const ouNull = (s: string) => (s ? s : null)
const entier = (s: string, defaut: number) => {
  const n = Number.parseInt(s, 10)
  return Number.isFinite(n) ? n : defaut
}

function lireFormation(formData: FormData) {
  const attendus = champ(formData, 'expectedLearners')
  return {
    name: champ(formData, 'name'),
    description: ouNull(champ(formData, 'description')),
    startsOn: ouNull(champ(formData, 'startsOn')),
    endsOn: ouNull(champ(formData, 'endsOn')),
    schedule: ouNull(champ(formData, 'schedule')),
    expectedLearners: attendus ? entier(attendus, 0) : null,
    expectations: ouNull(champ(formData, 'expectations')),
    partner: ouNull(champ(formData, 'partner')),
  }
}

export async function creerFormation(formData: FormData) {
  const session = await requirePermission('gererFormations')
  if (!session) redirect('/admin')
  const valeurs = lireFormation(formData)
  if (!valeurs.name) redirect(`${BASE}?e=manquant`)
  const [f] = await db.insert(programs).values(valeurs).returning()
  revalidatePath(BASE)
  redirect(`${BASE}/${f.id}?ok=creee`)
}

export async function modifierFormation(formData: FormData) {
  const session = await requirePermission('gererFormations')
  if (!session) redirect('/admin')
  const id = champ(formData, 'programId')
  const valeurs = lireFormation(formData)
  if (!id || !valeurs.name) redirect(`${BASE}/${id}?e=manquant`)
  await db.update(programs).set(valeurs).where(eq(programs.id, id))
  revalidatePath(`${BASE}/${id}`)
  redirect(`${BASE}/${id}?ok=modifiee`)
}

export async function supprimerFormation(formData: FormData) {
  const session = await requirePermission('gererFormations')
  if (!session) redirect('/admin')
  const id = champ(formData, 'programId')
  if (!id) redirect(BASE)
  await db.delete(programs).where(eq(programs.id, id))
  revalidatePath(BASE)
  redirect(`${BASE}?ok=supprimee`)
}

/** L'IA rédige la liste d'objectifs ; l'administrateur la relit et la corrige. */
export async function genererObjectifsFormation(formData: FormData) {
  const session = await requirePermission('gererFormations')
  if (!session) redirect('/admin')
  const id = champ(formData, 'programId')
  const [f] = await db.select().from(programs).where(eq(programs.id, id)).limit(1)
  if (!f) redirect(BASE)
  const { liste, source } = await genererObjectifs(f)
  await db.update(programs).set({ goalChecklist: liste }).where(eq(programs.id, id))
  revalidatePath(`${BASE}/${id}`)
  redirect(`${BASE}/${id}?ok=${source === 'claude' ? 'objectifsIA' : 'objectifsRepli'}`)
}

export async function enregistrerObjectifs(formData: FormData) {
  const session = await requirePermission('gererFormations')
  if (!session) redirect('/admin')
  const id = champ(formData, 'programId')
  const liste = String(formData.get('objectifs') ?? '')
    .split('\n')
    .map((l) => l.replace(/^[\s•\-–*]+/, '').trim())
    .filter(Boolean)
    .slice(0, 20)
  await db.update(programs).set({ goalChecklist: liste }).where(eq(programs.id, id))
  revalidatePath(`${BASE}/${id}`)
  redirect(`${BASE}/${id}?ok=objectifs`)
}

function lireModule(formData: FormData) {
  const duree = champ(formData, 'durationHours')
  return {
    title: champ(formData, 'title'),
    description: ouNull(champ(formData, 'description')),
    durationHours: duree ? duree.replace(',', '.') : null,
    pointsTotal: Math.max(1, entier(champ(formData, 'pointsTotal'), 100)),
    pointsPresence: Math.max(0, entier(champ(formData, 'pointsPresence'), 10)),
    pointsRessource: Math.max(0, entier(champ(formData, 'pointsRessource'), 5)),
    pointsQuiz: Math.max(0, entier(champ(formData, 'pointsQuiz'), 30)),
    weight: Math.max(0, entier(champ(formData, 'weight'), 1)),
    passThresholdPct: Math.min(100, Math.max(1, entier(champ(formData, 'passThresholdPct'), 70))),
    trainerId: ouNull(champ(formData, 'trainerId')),
  }
}

export async function ajouterModule(formData: FormData) {
  const session = await requirePermission('gererFormations')
  if (!session) redirect('/admin')
  const programId = champ(formData, 'programId')
  const valeurs = lireModule(formData)
  if (!programId || !valeurs.title) redirect(`${BASE}/${programId}?e=manquant`)
  const [doublon] = await db
    .select({ id: programModules.id })
    .from(programModules)
    .where(and(eq(programModules.programId, programId), eq(programModules.title, valeurs.title)))
    .limit(1)
  if (doublon) redirect(`${BASE}/${programId}?e=moduleDoublon`)
  const [{ suivant }] = await db
    .select({ suivant: raw<number>`coalesce(max(${programModules.position}), 0)::int + 1` })
    .from(programModules)
    .where(eq(programModules.programId, programId))
  await db.insert(programModules).values({ programId, position: suivant, ...valeurs })
  revalidatePath(`${BASE}/${programId}`)
  redirect(`${BASE}/${programId}?ok=module`)
}

export async function modifierModule(formData: FormData) {
  const session = await requirePermission('gererFormations')
  if (!session) redirect('/admin')
  const programId = champ(formData, 'programId')
  const moduleId = champ(formData, 'moduleId')
  const valeurs = lireModule(formData)
  const position = Math.max(1, entier(champ(formData, 'position'), 1))
  if (!programId || !moduleId || !valeurs.title) redirect(`${BASE}/${programId}?e=manquant`)
  await db.update(programModules).set({ ...valeurs, position }).where(eq(programModules.id, moduleId))
  revalidatePath(`${BASE}/${programId}`)
  redirect(`${BASE}/${programId}?ok=module`)
}

export async function supprimerModule(formData: FormData) {
  const session = await requirePermission('gererFormations')
  if (!session) redirect('/admin')
  const programId = champ(formData, 'programId')
  const moduleId = champ(formData, 'moduleId')
  if (!moduleId) redirect(`${BASE}/${programId}`)
  await db.delete(programModules).where(eq(programModules.id, moduleId))
  revalidatePath(`${BASE}/${programId}`)
  redirect(`${BASE}/${programId}?ok=moduleSupprime`)
}

export async function rattacherPromotion(formData: FormData) {
  const session = await requirePermission('gererFormations')
  if (!session) redirect('/admin')
  const programId = champ(formData, 'programId')
  const cohortId = champ(formData, 'cohortId')
  if (!programId || !cohortId) redirect(`${BASE}/${programId}?e=manquant`)
  await db.update(cohorts).set({ programId }).where(eq(cohorts.id, cohortId))
  revalidatePath(`${BASE}/${programId}`)
  redirect(`${BASE}/${programId}?ok=promotion`)
}

export async function detacherPromotion(formData: FormData) {
  const session = await requirePermission('gererFormations')
  if (!session) redirect('/admin')
  const programId = champ(formData, 'programId')
  const cohortId = champ(formData, 'cohortId')
  await db.update(cohorts).set({ programId: null }).where(eq(cohorts.id, cohortId))
  revalidatePath(`${BASE}/${programId}`)
  redirect(`${BASE}/${programId}?ok=detachee`)
}

/** Attribution groupée : les modules cochés passent au formateur choisi (ou à personne). */
export async function attribuerFormateurs(formData: FormData) {
  const session = await requirePermission('gererFormations')
  if (!session) redirect('/admin')
  const programId = champ(formData, 'programId')
  const moduleIds = formData.getAll('moduleIds').map(String).filter(Boolean)
  const trainerId = ouNull(champ(formData, 'trainerId'))
  if (!programId) redirect(BASE)
  if (moduleIds.length === 0) redirect(`${BASE}/${programId}?e=selectionVide`)
  await db
    .update(programModules)
    .set({ trainerId })
    .where(and(eq(programModules.programId, programId), inArray(programModules.id, moduleIds)))
  revalidatePath(`${BASE}/${programId}`)
  revalidatePath('/')
  redirect(`${BASE}/${programId}?ok=attribues&n=${moduleIds.length}`)
}
