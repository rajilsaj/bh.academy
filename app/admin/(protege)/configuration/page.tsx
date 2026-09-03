import Link from 'next/link'
import { count } from 'drizzle-orm'
import { AccesRefuse } from '@/components/AccesRefuse'
import { EnTete } from '@/components/admin/Cockpit'
import { googleActive, requirePermission } from '@/lib/auth'
import { appUrl } from '@/lib/config'
import { db } from '@/lib/db'
import { learners, staff, visits } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { BUCKET, supabaseActif } from '@/lib/storage'

export const dynamic = 'force-dynamic'

const t = fr.admin.configuration

type Service = { nom: string; actif: boolean; detail: string; aide: string; variables: string[] }

/**
 * L'état de la configuration : quels services sont branchés, lesquels ne le
 * sont pas encore, et quelle variable d'environnement les active. Rien n'est
 * modifiable ici — les secrets vivent dans Vercel — mais on voit d'un coup
 * d'œil ce qui manque.
 */
export default async function ConfigurationPage() {
  const session = await requirePermission('gererConfiguration')
  if (!session) return <AccesRefuse />

  let base: { ok: boolean; apprenants: number; comptes: number; visites: number } = { ok: false, apprenants: 0, comptes: 0, visites: 0 }
  try {
    const [[a], [c], [v]] = await Promise.all([
      db.select({ n: count() }).from(learners),
      db.select({ n: count() }).from(staff),
      db.select({ n: count() }).from(visits),
    ])
    base = { ok: true, apprenants: a.n, comptes: c.n, visites: v.n }
  } catch {
    base.ok = false
  }

  const smtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER)
  const services: Service[] = [
    {
      nom: t.services.base,
      actif: base.ok,
      detail: base.ok ? t.baseDetail.replace('{apprenants}', String(base.apprenants)).replace('{comptes}', String(base.comptes)) : t.injoignable,
      aide: t.services.baseAide,
      variables: ['DATABASE_URL'],
    },
    {
      nom: t.services.stockage,
      actif: supabaseActif(),
      detail: supabaseActif() ? t.stockageDetail.replace('{bucket}', BUCKET) : t.stockageLocal,
      aide: t.services.stockageAide,
      variables: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_BUCKET'],
    },
    {
      nom: t.services.connexion,
      actif: Boolean(process.env.AUTH_SECRET && process.env.TOKEN_SECRET),
      detail: process.env.AUTH_SECRET && process.env.TOKEN_SECRET ? t.secretsOk : t.secretsManquants,
      aide: t.services.connexionAide,
      variables: ['AUTH_SECRET', 'TOKEN_SECRET'],
    },
    {
      nom: t.services.google,
      actif: googleActive,
      detail: googleActive ? t.actif : t.inactif,
      aide: t.services.googleAide.replace('{url}', `${appUrl()}/api/auth/callback/google`),
      variables: ['AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET'],
    },
    {
      nom: t.services.assistant,
      actif: Boolean(process.env.ANTHROPIC_API_KEY),
      detail: process.env.ANTHROPIC_API_KEY ? t.actif : t.assistantRepli,
      aide: t.services.assistantAide,
      variables: ['ANTHROPIC_API_KEY'],
    },
    {
      nom: t.services.courriel,
      actif: smtp,
      detail: smtp ? `${process.env.SMTP_HOST} · ${process.env.SMTP_FROM ?? process.env.SMTP_USER}` : t.courrielInactif,
      aide: t.services.courrielAide,
      variables: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'],
    },
    {
      nom: t.services.sms,
      actif: Boolean(process.env.SMS_WEBHOOK_URL),
      detail: process.env.SMS_WEBHOOK_URL ? t.actif : t.inactif,
      aide: t.services.smsAide,
      variables: ['SMS_WEBHOOK_URL', 'SMS_WEBHOOK_TOKEN'],
    },
  ]
  const actifs = services.filter((s) => s.actif).length

  return (
    <div className="space-y-6">
      <EnTete titre={t.titre} sousTitre={t.sousTitre} />

      {/* ------------------------------------------------------ en un coup d'œil */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="bo-panneau">
          <p className="bo-doux">{t.servicesActifs}</p>
          <p className="bo-chiffre mt-1">
            {actifs}
            <span className="text-lg text-bo-doux"> / {services.length}</span>
          </p>
        </div>
        <div className="bo-panneau">
          <p className="bo-doux">{t.adresse}</p>
          <p className="mt-1 break-all font-mono text-sm">{appUrl()}</p>
        </div>
        <div className="bo-panneau">
          <p className="bo-doux">{fr.admin.nav.visites}</p>
          <p className="bo-chiffre mt-1">{base.visites}</p>
          <Link href="/admin/visites" className="bo-doux underline">{t.voirVisites}</Link>
        </div>
      </section>

      {/* ------------------------------------------------------------- services */}
      <section className="bo-panneau">
        <h2 className="mb-3 font-semibold">{t.services.titre}</h2>
        <ul className="divide-y divide-bo-bordure">
          {services.map((s) => (
            <li key={s.nom} className="grid gap-2 py-4 sm:grid-cols-[1.5rem_1fr_auto] sm:gap-4">
              <span
                aria-label={s.actif ? t.actif : t.inactif}
                className={`mt-0.5 grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                  s.actif ? 'bg-bo-menthe text-white' : 'border-2 border-bo-bordure text-bo-doux'
                }`}
              >
                {s.actif ? '✓' : '·'}
              </span>
              <div className="min-w-0">
                <p className="font-semibold">{s.nom}</p>
                <p className="text-sm text-bo-doux">{s.detail}</p>
                {!s.actif ? <p className="mt-1 text-sm">{s.aide}</p> : null}
              </div>
              <div className="flex flex-wrap gap-1 sm:max-w-xs sm:justify-end">
                {s.variables.map((v) => (
                  <code key={v} className="bo-puce !font-mono !text-[11px]">{v}</code>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <p className="bo-doux mt-4">{t.ouModifier}</p>
      </section>
    </div>
  )
}
