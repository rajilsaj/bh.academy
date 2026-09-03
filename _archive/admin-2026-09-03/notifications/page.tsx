import { desc } from 'drizzle-orm'
import { AccesRefuse, AlerteSombre, SuccesSombre } from '@/components/AccesRefuse'
import { requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { NOTIFICATION_CHANNELS, notifications } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { formatDateTime } from '@/lib/format'
import { fournisseurs } from '@/lib/notifications'
import { composer, reessayer } from './actions'

export const dynamic = 'force-dynamic'

const t = fr.admin.notifications

const TEINTE_STATUT = {
  en_attente: 'border-bo-jaune/50 text-bo-jaune',
  envoye: 'border-bo-menthe/50 text-bo-menthe',
  echec: 'border-bo-rose/50 text-bo-rose',
} as const

export default async function NotificationsPage({ searchParams }: { searchParams: { ok?: string; e?: string; n?: string; s?: string } }) {
  const session = await requirePermission('gererNotifications')
  if (!session) return <AccesRefuse />

  const [dispo, journal] = await Promise.all([
    Promise.resolve(fournisseurs()),
    db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(100),
  ])
  const enAttente = journal.filter((n) => n.status !== 'envoye').length

  let messageOk: string | null = null
  if (searchParams.ok === 'envoyes') messageOk = t.messages.envoyes.replace('{n}', searchParams.n ?? '0').replace('{e}', searchParams.s ?? '0')
  if (searchParams.ok === 'reessayes') messageOk = t.messages.reessayes.replace('{n}', searchParams.n ?? '0')
  const messageErreur = searchParams.e === 'aucunDestinataire' ? t.aucunDestinataire : searchParams.e ? t.messages.manquant : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">{t.titre}</h1>
        <p className="mt-1 text-sm text-bo-doux">{t.sousTitre}</p>
      </div>
      {messageOk ? <SuccesSombre>{messageOk}</SuccesSombre> : null}
      {messageErreur ? <AlerteSombre>{messageErreur}</AlerteSombre> : null}

      <section className="bo-panneau">
        <h2 className="mb-2 font-semibold">{t.fournisseurs}</h2>
        <ul className="space-y-1 text-sm">
          <li className={dispo.mail ? 'text-bo-menthe' : 'text-bo-jaune'}>{dispo.mail ? `${t.mailOk}${dispo.expediteur ? ` (${dispo.expediteur})` : ''}` : t.mailKo}</li>
          <li className={dispo.sms ? 'text-bo-menthe' : 'text-bo-jaune'}>{dispo.sms ? t.smsOk : t.smsKo}</li>
        </ul>
      </section>

      <section className="bo-panneau">
        <h2 className="mb-3 font-semibold">{t.composer}</h2>
        <form action={composer} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="bo-doux mb-1 block" htmlFor="channel">{t.canal}</label>
            <select id="channel" name="channel" defaultValue="mail" className="bo-champ">
              {NOTIFICATION_CHANNELS.map((c) => (
                <option key={c} value={c}>{t.canaux[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="bo-doux mb-1 block" htmlFor="cible">{t.destinataires}</label>
            <select id="cible" name="cible" defaultValue="apprenants" className="bo-champ">
              {(Object.keys(t.cibles) as (keyof typeof t.cibles)[]).map((c) => (
                <option key={c} value={c}>{t.cibles[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="bo-doux mb-1 block" htmlFor="learnerId">{t.identifiantApprenant}</label>
            <input id="learnerId" name="learnerId" placeholder="BH-IA-001" className="bo-champ" />
          </div>
          <div>
            <label className="bo-doux mb-1 block" htmlFor="recipient">{t.destinataireLibre}</label>
            <input id="recipient" name="recipient" className="bo-champ" />
          </div>
          <div className="sm:col-span-2">
            <label className="bo-doux mb-1 block" htmlFor="subject">{t.sujet}</label>
            <input id="subject" name="subject" maxLength={200} className="bo-champ" />
          </div>
          <div className="sm:col-span-2">
            <label className="bo-doux mb-1 block" htmlFor="body">{t.corps}</label>
            <textarea id="body" name="body" required rows={5} maxLength={2000} className="bo-champ" />
            <p className="bo-doux mt-1">{t.corpsAide}</p>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="bo-bouton">{t.envoyer}</button>
          </div>
        </form>
      </section>

      <section className="bo-panneau">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">
            {t.journal} <span className="bo-doux">({journal.length})</span>
          </h2>
          {enAttente > 0 ? (
            <form action={reessayer}>
              <button type="submit" className="bo-bouton-discret">{t.reessayer} ({enAttente})</button>
            </form>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="bo-tableau">
            <thead>
              <tr>
                <th>{t.colonneDate}</th>
                <th>{t.colonneCanal}</th>
                <th>{t.colonneDestinataire}</th>
                <th>{t.sujet}</th>
                <th>{t.colonneStatut}</th>
              </tr>
            </thead>
            <tbody>
              {journal.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-bo-doux">{fr.app.aucuneDonnee}</td>
                </tr>
              ) : null}
              {journal.map((n) => (
                <tr key={n.id}>
                  <td className="whitespace-nowrap">{formatDateTime(n.createdAt)}</td>
                  <td>{t.canaux[n.channel]}</td>
                  <td className="break-all">
                    {n.recipientName ? <span className="block">{n.recipientName}</span> : null}
                    <span className="bo-doux">{n.recipient}</span>
                  </td>
                  <td>
                    <details>
                      <summary className="cursor-pointer">{n.subject || n.body.slice(0, 60)}</summary>
                      <p className="mt-2 whitespace-pre-line text-xs text-bo-doux">{n.body}</p>
                    </details>
                  </td>
                  <td>
                    <span className={`bo-puce !bg-transparent ${TEINTE_STATUT[n.status]}`}>{t.statuts[n.status]}</span>
                    {n.error ? <span className="bo-doux block max-w-56 truncate" title={n.error}>{n.error}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
