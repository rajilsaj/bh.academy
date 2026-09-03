import { headers } from 'next/headers'
import { and, count, countDistinct, desc, eq, gte, lt, max, min, sql as raw } from 'drizzle-orm'
import { db } from '@/lib/db'
import { visits } from '@/lib/db/schema'

/**
 * Mesure d'audience. L'enregistrement se fait depuis le layout racine, à
 * partir des en-têtes posés par `middleware.ts` ; tout le reste est lecture
 * et agrégation pour l'écran « Visites » du back-office.
 */

const ROBOTS = /bot|crawl|spider|slurp|preview|fetch|monitor|curl|wget|python|httpclient|headless/i

/** Enregistre la page vue de la requête en cours ; silencieux hors périmètre. */
export async function enregistrerVisite(): Promise<void> {
  const h = headers()
  const chemin = h.get('x-chemin')
  const visiteur = h.get('x-visiteur')
  if (!chemin || !visiteur) return // pas passé par le middleware : back-office, API

  const userAgent = h.get('user-agent') ?? ''
  if (!userAgent || ROBOTS.test(userAgent)) return

  const ip = (h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? '').split(',')[0]?.trim() || null
  await db.insert(visits).values({
    visitorId: visiteur,
    ip,
    country: h.get('x-vercel-ip-country'),
    city: h.get('x-vercel-ip-city') ? decodeURIComponent(h.get('x-vercel-ip-city')!) : null,
    path: chemin.slice(0, 500),
    referer: h.get('referer')?.slice(0, 500) ?? null,
    userAgent: userAgent.slice(0, 300),
  })
}

const depuis = (jours: number) => new Date(Date.now() - jours * 86_400_000)

export async function statsVisites() {
  const aujourdhui = new Date()
  aujourdhui.setHours(0, 0, 0, 0)
  const [total, semaine, jour] = await Promise.all([
    db.select({ visites: count(), visiteurs: countDistinct(visits.visitorId) }).from(visits),
    db.select({ visites: count(), visiteurs: countDistinct(visits.visitorId) }).from(visits).where(gte(visits.createdAt, depuis(7))),
    db.select({ visites: count(), visiteurs: countDistinct(visits.visitorId) }).from(visits).where(gte(visits.createdAt, aujourdhui)),
  ])
  return { total: total[0], semaine: semaine[0], jour: jour[0] }
}

/** Visites par jour sur les 14 derniers jours, jours vides compris. */
export async function visitesParJour(jours = 14) {
  const lignes = await db
    .select({
      jour: raw<string>`to_char(${visits.createdAt} at time zone 'Africa/Brazzaville', 'YYYY-MM-DD')`,
      visites: count(),
      visiteurs: countDistinct(visits.visitorId),
    })
    .from(visits)
    .where(gte(visits.createdAt, depuis(jours)))
    .groupBy(raw`1`)
  const parJour = new Map(lignes.map((l) => [l.jour, l]))
  const serie: { jour: string; visites: number; visiteurs: number }[] = []
  for (let i = jours - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000)
    const cle = d.toLocaleDateString('sv-SE', { timeZone: 'Africa/Brazzaville' })
    const l = parJour.get(cle)
    serie.push({ jour: cle, visites: l?.visites ?? 0, visiteurs: l?.visiteurs ?? 0 })
  }
  return serie
}

/** Les pages les plus vues, et sur combien de visiteurs distincts. */
export async function pagesLesPlusVues(limite = 15) {
  return db
    .select({ path: visits.path, visites: count(), visiteurs: countDistinct(visits.visitorId) })
    .from(visits)
    .groupBy(visits.path)
    .orderBy(desc(count()))
    .limit(limite)
}

export type LigneVisiteur = {
  visitorId: string
  ip: string | null
  country: string | null
  visites: number
  premiere: Date
  derniere: Date
  atterrissage: string
}

/** Un visiteur par ligne : dernière IP, nombre de visites, première page vue. */
export async function listeVisiteurs(limite = 100): Promise<LigneVisiteur[]> {
  const lignes = await db.execute<{
    visitor_id: string
    ip: string | null
    country: string | null
    visites: number
    premiere: string
    derniere: string
    atterrissage: string
  }>(raw`
    select v.visitor_id,
           (array_agg(v.ip order by v.created_at desc))[1]      as ip,
           (array_agg(v.country order by v.created_at desc))[1] as country,
           count(*)::int                                          as visites,
           min(v.created_at)                                      as premiere,
           max(v.created_at)                                      as derniere,
           (array_agg(v.path order by v.created_at asc))[1]      as atterrissage
    from visits v
    group by v.visitor_id
    order by max(v.created_at) desc
    limit ${limite}
  `)
  return Array.from(lignes).map((l) => ({
    visitorId: l.visitor_id,
    ip: l.ip,
    country: l.country,
    visites: Number(l.visites),
    premiere: new Date(l.premiere),
    derniere: new Date(l.derniere),
    atterrissage: l.atterrissage,
  }))
}

/** Tout ce qu'on sait d'un visiteur : ses visites, ses pages, ses adresses. */
export async function detailVisiteur(visitorId: string) {
  const [liste, parPage, adresses, bornes] = await Promise.all([
    db.select().from(visits).where(eq(visits.visitorId, visitorId)).orderBy(desc(visits.createdAt)).limit(500),
    db
      .select({ path: visits.path, visites: count() })
      .from(visits)
      .where(eq(visits.visitorId, visitorId))
      .groupBy(visits.path)
      .orderBy(desc(count())),
    db
      .select({ ip: visits.ip, country: visits.country, city: visits.city, visites: count(), derniere: max(visits.createdAt) })
      .from(visits)
      .where(eq(visits.visitorId, visitorId))
      .groupBy(visits.ip, visits.country, visits.city)
      .orderBy(desc(max(visits.createdAt))),
    db
      .select({ premiere: min(visits.createdAt), derniere: max(visits.createdAt), total: count() })
      .from(visits)
      .where(eq(visits.visitorId, visitorId)),
  ])
  if (liste.length === 0) return null
  return { liste, parPage, adresses, ...bornes[0], userAgent: liste[0].userAgent }
}

export async function supprimerVisiteur(visitorId: string) {
  await db.delete(visits).where(eq(visits.visitorId, visitorId))
}

/** Efface les visites plus anciennes que `jours` ; renvoie le nombre supprimé. */
export async function purgerVisites(jours: number): Promise<number> {
  const supprimees = await db.delete(visits).where(and(lt(visits.createdAt, depuis(jours)))).returning({ id: visits.id })
  return supprimees.length
}
