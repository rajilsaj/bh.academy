'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { programModules, sessions } from '@/lib/db/schema'
import { requirePermission } from '@/lib/auth'
import { generateDayCode } from '@/lib/ids'

const BASE = '/admin/sessions'
const champ = (f: FormData, nom: string) => String(f.get(nom) ?? '').trim()

/** Heure locale de Brazzaville (UTC+1, sans heure d'été). */
const FUSEAU = '+01:00'
function instant(date: string, heure: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(heure)) return null
  const d = new Date(`${date}T${heure}:00${FUSEAU}`)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Un code unique en base : on retente tant que le tirage entre en collision. */
async function codeUnique(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateDayCode()
    const [pris] = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.dayCode, code)).limit(1)
    if (!pris) return code
  }
  throw new Error('Impossible de générer un code de session unique')
}

/** Une session : un module, une date, une heure de début et de fin. */
export async function creerSession(formData: FormData) {
  const session = await requirePermission('gererSessions')
  if (!session) redirect('/admin')

  const cohortId = champ(formData, 'cohortId')
  const moduleName = champ(formData, 'moduleName')
  const heldOn = champ(formData, 'heldOn')
  const debut = instant(heldOn, champ(formData, 'debut'))
  const fin = instant(heldOn, champ(formData, 'fin'))
  if (!cohortId || !moduleName || !debut || !fin) redirect(`${BASE}?e=manquant`)
  if (fin <= debut) redirect(`${BASE}?e=horaire`)

  await db.insert(sessions).values({ cohortId, moduleName, heldOn, dayCode: await codeUnique(), opensAt: debut, closesAt: fin })
  revalidatePath(BASE)
  revalidatePath('/admin')
  redirect(`${BASE}?ok=creee`)
}

/**
 * Planification groupée : les modules cochés, dans l'ordre du programme, une
 * session par semaine à partir de la date choisie, aux mêmes heures.
 */
export async function planifierModules(formData: FormData) {
  const session = await requirePermission('gererSessions')
  if (!session) redirect('/admin')

  const cohortId = champ(formData, 'cohortId')
  const moduleIds = formData.getAll('moduleIds').map(String).filter(Boolean)
  const premiere = champ(formData, 'premiereDate')
  const heureDebut = champ(formData, 'debut')
  const heureFin = champ(formData, 'fin')
  const intervalle = Number.parseInt(champ(formData, 'intervalleJours') || '7', 10)
  if (!cohortId || moduleIds.length === 0 || !instant(premiere, heureDebut) || !instant(premiere, heureFin)) {
    redirect(`${BASE}?e=manquant`)
  }
  if (instant(premiere, heureFin)! <= instant(premiere, heureDebut)!) redirect(`${BASE}?e=horaire`)

  const modules = await db
    .select({ id: programModules.id, title: programModules.title })
    .from(programModules)
    .where(inArray(programModules.id, moduleIds))
    .orderBy(asc(programModules.position))

  const lignes = []
  for (let i = 0; i < modules.length; i++) {
    const jour = new Date(`${premiere}T12:00:00${FUSEAU}`)
    jour.setUTCDate(jour.getUTCDate() + i * (Number.isFinite(intervalle) && intervalle > 0 ? intervalle : 7))
    const heldOn = jour.toISOString().slice(0, 10)
    lignes.push({
      cohortId,
      moduleName: modules[i].title,
      heldOn,
      dayCode: await codeUnique(),
      opensAt: instant(heldOn, heureDebut)!,
      closesAt: instant(heldOn, heureFin)!,
    })
  }
  if (lignes.length > 0) await db.insert(sessions).values(lignes)

  revalidatePath(BASE)
  revalidatePath('/admin')
  redirect(`${BASE}?ok=planifiees&n=${lignes.length}`)
}

export async function modifierSession(formData: FormData) {
  const session = await requirePermission('gererSessions')
  if (!session) redirect('/admin')
  const id = champ(formData, 'sessionId')
  const heldOn = champ(formData, 'heldOn')
  const debut = instant(heldOn, champ(formData, 'debut'))
  const fin = instant(heldOn, champ(formData, 'fin'))
  const moduleName = champ(formData, 'moduleName')
  if (!id || !moduleName || !debut || !fin) redirect(`${BASE}?e=manquant`)
  if (fin <= debut) redirect(`${BASE}?e=horaire`)
  await db.update(sessions).set({ moduleName, heldOn, opensAt: debut, closesAt: fin }).where(eq(sessions.id, id))
  revalidatePath(BASE)
  revalidatePath('/admin')
  redirect(`${BASE}?ok=modifiee`)
}

export async function regenererCode(formData: FormData) {
  const session = await requirePermission('gererSessions')
  if (!session) redirect('/admin')
  const id = champ(formData, 'sessionId')
  if (!id) redirect(BASE)
  await db.update(sessions).set({ dayCode: await codeUnique() }).where(eq(sessions.id, id))
  revalidatePath(BASE)
  redirect(`${BASE}?ok=code`)
}

/** Actions groupées sur les sessions cochées : supprimer, ou décaler de n jours. */
export async function sessionsEnMasse(formData: FormData) {
  const session = await requirePermission('gererSessions')
  if (!session) redirect('/admin')
  const ids = formData.getAll('sessionIds').map(String).filter(Boolean)
  const action = champ(formData, 'action')
  if (ids.length === 0) redirect(`${BASE}?e=selection`)

  if (action === 'supprimer') {
    await db.delete(sessions).where(inArray(sessions.id, ids))
    revalidatePath(BASE)
    revalidatePath('/admin')
    redirect(`${BASE}?ok=supprimees&n=${ids.length}`)
  }

  if (action === 'decaler') {
    const jours = Number.parseInt(champ(formData, 'jours') || '0', 10)
    if (!Number.isFinite(jours) || jours === 0) redirect(`${BASE}?e=manquant`)
    const lignes = await db.select().from(sessions).where(inArray(sessions.id, ids))
    for (const s of lignes) {
      const decale = (d: Date) => new Date(d.getTime() + jours * 86_400_000)
      const jour = new Date(`${s.heldOn}T12:00:00${FUSEAU}`)
      jour.setUTCDate(jour.getUTCDate() + jours)
      await db
        .update(sessions)
        .set({ heldOn: jour.toISOString().slice(0, 10), opensAt: decale(s.opensAt), closesAt: decale(s.closesAt) })
        .where(eq(sessions.id, s.id))
    }
    revalidatePath(BASE)
    revalidatePath('/admin')
    redirect(`${BASE}?ok=decalees&n=${lignes.length}`)
  }

  redirect(BASE)
}
