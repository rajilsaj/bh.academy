import nodemailer from 'nodemailer'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { notifications, type NotificationChannel } from '@/lib/db/schema'

/**
 * Centre de notifications : courriel et SMS.
 *
 * Chaque message est d'abord écrit en base (`en_attente`), puis on tente
 * l'envoi. Sans fournisseur configuré, il reste en attente : rien n'est perdu,
 * et « Réessayer » l'enverra dès que les variables seront renseignées.
 *
 *   - Courriel : SMTP classique (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
 *     SMTP_FROM). Gmail : smtp.gmail.com, port 465, mot de passe d'application.
 *   - SMS : un webhook HTTP générique (SMS_WEBHOOK_URL, SMS_WEBHOOK_TOKEN) qui
 *     reçoit `{ to, body }` en JSON — la passerelle de l'opérateur ou un relais
 *     maison se branche là sans toucher au code.
 */

export type Fournisseurs = { mail: boolean; sms: boolean; expediteur: string | null }

export function fournisseurs(): Fournisseurs {
  return {
    mail: Boolean(process.env.SMTP_HOST),
    sms: Boolean(process.env.SMS_WEBHOOK_URL),
    expediteur: process.env.SMTP_FROM ?? null,
  }
}

function transporteur() {
  const port = Number(process.env.SMTP_PORT ?? 587)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' }
      : undefined,
  })
}

type Message = {
  channel: NotificationChannel
  recipient: string
  recipientName?: string | null
  subject?: string | null
  body: string
  learnerId?: string | null
  staffId?: string | null
  createdBy?: string | null
}

/** Écrit le message puis tente l'envoi ; renvoie la ligne à jour. */
export async function notifier(message: Message) {
  const [row] = await db
    .insert(notifications)
    .values({
      channel: message.channel,
      recipient: message.recipient.trim(),
      recipientName: message.recipientName ?? null,
      subject: message.subject ?? null,
      body: message.body,
      learnerId: message.learnerId ?? null,
      staffId: message.staffId ?? null,
      createdBy: message.createdBy ?? null,
    })
    .returning()
  return envoyer(row.id)
}

/** Tente l'envoi d'un message en base. Ne lève jamais : l'état est en base. */
export async function envoyer(id: string) {
  const [row] = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1)
  if (!row) return null
  const dispo = fournisseurs()

  const manque = row.channel === 'mail' ? !dispo.mail : !dispo.sms
  if (manque) {
    const error = row.channel === 'mail' ? 'SMTP non configuré' : 'Passerelle SMS non configurée'
    const [maj] = await db
      .update(notifications)
      .set({ status: 'en_attente', error })
      .where(eq(notifications.id, id))
      .returning()
    return maj
  }

  try {
    if (row.channel === 'mail') {
      await transporteur().sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to: row.recipientName ? `"${row.recipientName}" <${row.recipient}>` : row.recipient,
        subject: row.subject ?? '',
        text: row.body,
      })
    } else {
      const reponse = await fetch(process.env.SMS_WEBHOOK_URL as string, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.SMS_WEBHOOK_TOKEN
            ? { Authorization: `Bearer ${process.env.SMS_WEBHOOK_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({ to: row.recipient, body: row.body }),
        signal: AbortSignal.timeout(10_000),
      })
      if (!reponse.ok) throw new Error(`Passerelle SMS : HTTP ${reponse.status}`)
    }
    const [maj] = await db
      .update(notifications)
      .set({ status: 'envoye', error: null, sentAt: new Date() })
      .where(eq(notifications.id, id))
      .returning()
    return maj
  } catch (erreur) {
    const [maj] = await db
      .update(notifications)
      .set({ status: 'echec', error: String((erreur as Error)?.message ?? erreur).slice(0, 300) })
      .where(eq(notifications.id, id))
      .returning()
    return maj
  }
}

/** Réessaie tout ce qui n'est pas parti. */
export async function reessayerEnAttente() {
  const rows = await db
    .select({ id: notifications.id, status: notifications.status })
    .from(notifications)
    .orderBy(desc(notifications.createdAt))
    .limit(200)
  let envoyes = 0
  for (const r of rows) {
    if (r.status === 'envoye') continue
    const maj = await envoyer(r.id)
    if (maj?.status === 'envoye') envoyes++
  }
  return envoyes
}

/** Remplace `{nom}` et `{lien}` dans un modèle. */
export function remplir(modele: string, valeurs: Record<string, string>): string {
  return modele.replace(/\{(\w+)\}/g, (tout, cle: string) => valeurs[cle] ?? tout)
}
