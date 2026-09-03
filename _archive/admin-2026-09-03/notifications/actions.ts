'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { cohorts, learners, NOTIFICATION_CHANNELS, staff, trainerProfiles, type NotificationChannel } from '@/lib/db/schema'
import { requirePermission } from '@/lib/auth'
import { learnerLink } from '@/lib/config'
import { notifier, reessayerEnAttente, remplir } from '@/lib/notifications'
import { toWhatsAppNumber } from '@/lib/format'

const BASE = '/admin/notifications'
const champ = (f: FormData, nom: string) => String(f.get(nom) ?? '').trim()

type Cible = { recipient: string; recipientName: string; learnerId?: string; staffId?: string; valeurs: Record<string, string> }

/** Résout la liste des destinataires selon la cible et le canal. */
async function destinataires(cible: string, canal: NotificationChannel, formData: FormData): Promise<Cible[]> {
  const adresse = (l: { email: string | null; phone: string | null }) =>
    canal === 'mail' ? l.email : toWhatsAppNumber(l.phone)

  if (cible === 'apprenants') {
    const [promo] = await db.select().from(cohorts).orderBy(asc(cohorts.startsOn)).limit(1)
    if (!promo) return []
    const rows = await db.select().from(learners).where(eq(learners.cohortId, promo.id)).orderBy(asc(learners.id))
    return rows
      .map((l) => ({ l, a: adresse(l) }))
      .filter((x): x is { l: typeof rows[number]; a: string } => Boolean(x.a))
      .map(({ l, a }) => ({ recipient: a, recipientName: l.fullName, learnerId: l.id, valeurs: { nom: l.fullName.split(' ')[0], lien: learnerLink(l.token) } }))
  }
  if (cible === 'apprenant') {
    const id = champ(formData, 'learnerId').toUpperCase()
    const [l] = await db.select().from(learners).where(eq(learners.id, id)).limit(1)
    const a = l ? adresse(l) : null
    return l && a ? [{ recipient: a, recipientName: l.fullName, learnerId: l.id, valeurs: { nom: l.fullName.split(' ')[0], lien: learnerLink(l.token) } }] : []
  }
  if (cible === 'formateurs') {
    const rows = await db
      .select({ id: staff.id, email: staff.email, nom: trainerProfiles.fullName, phone: trainerProfiles.phone })
      .from(staff)
      .leftJoin(trainerProfiles, eq(trainerProfiles.staffId, staff.id))
      .where(eq(staff.role, 'formateur'))
    return rows
      .map((f) => ({ f, a: canal === 'mail' ? f.email : toWhatsAppNumber(f.phone) }))
      .filter((x): x is { f: typeof rows[number]; a: string } => Boolean(x.a))
      .map(({ f, a }) => ({ recipient: a, recipientName: f.nom ?? f.email, staffId: f.id, valeurs: { nom: f.nom ?? f.email, lien: '' } }))
  }
  const libre = champ(formData, 'recipient')
  return libre ? [{ recipient: libre, recipientName: '', valeurs: { nom: '', lien: '' } }] : []
}

export async function composer(formData: FormData) {
  const session = await requirePermission('gererNotifications')
  if (!session) redirect('/admin')
  const canal = champ(formData, 'channel') as NotificationChannel
  const cible = champ(formData, 'cible')
  const sujet = champ(formData, 'subject')
  const corps = champ(formData, 'body')
  if (!NOTIFICATION_CHANNELS.includes(canal) || !corps) redirect(`${BASE}?e=manquant`)

  const liste = await destinataires(cible, canal, formData)
  if (liste.length === 0) redirect(`${BASE}?e=aucunDestinataire`)

  let envoyes = 0
  for (const d of liste) {
    const r = await notifier({
      channel: canal,
      recipient: d.recipient,
      recipientName: d.recipientName || null,
      subject: canal === 'mail' ? remplir(sujet, d.valeurs) : null,
      body: remplir(corps, d.valeurs),
      learnerId: d.learnerId ?? null,
      staffId: d.staffId ?? null,
      createdBy: session.user.id,
    })
    if (r?.status === 'envoye') envoyes++
  }
  revalidatePath(BASE)
  redirect(`${BASE}?ok=envoyes&n=${liste.length}&s=${envoyes}`)
}

export async function reessayer() {
  const session = await requirePermission('gererNotifications')
  if (!session) redirect('/admin')
  const n = await reessayerEnAttente()
  revalidatePath(BASE)
  redirect(`${BASE}?ok=reessayes&n=${n}`)
}
