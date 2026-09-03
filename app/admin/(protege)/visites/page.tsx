import Link from 'next/link'
import { AccesRefuse, SuccesSombre } from '@/components/AccesRefuse'
import { EnTete } from '@/components/admin/Cockpit'
import { BarresPages } from '@/components/VisitesVisiteur'
import { requirePermission } from '@/lib/auth'
import { fr } from '@/lib/i18n/fr'
import { formatDateTime } from '@/lib/format'
import { listeVisiteurs, pagesLesPlusVues, statsVisites, visitesParJour } from '@/lib/visites'
import { purger } from './actions'

export const dynamic = 'force-dynamic'

const t = fr.admin.visites

/**
 * L'audience du site : combien de visites, combien de personnes, quelles
 * pages, et qui revient. Réservé à l'administrateur.
 */
export default async function VisitesPage({ searchParams }: { searchParams: { ok?: string; n?: string } }) {
  const session = await requirePermission('voirVisites')
  if (!session) return <AccesRefuse />

  const [stats, parJour, pages, visiteurs] = await Promise.all([
    statsVisites(),
    visitesParJour(14),
    pagesLesPlusVues(15),
    listeVisiteurs(100),
  ])
  const totalPages = pages.reduce((n, p) => n + p.visites, 0)
  const maxJour = Math.max(1, ...parJour.map((j) => j.visites))

  const message =
    searchParams.ok === 'purge'
      ? t.messages.purge.replace('{n}', searchParams.n ?? '0')
      : searchParams.ok === 'visiteurSupprime'
        ? t.messages.visiteurSupprime
        : null

  return (
    <div className="space-y-6">
      <EnTete
        titre={t.titre}
        sousTitre={t.sousTitre}
        actions={
          <form action={purger}>
            <input type="hidden" name="jours" value="90" />
            <button type="submit" className="bo-bouton-discret">{t.purger}</button>
          </form>
        }
      />
      {message ? <SuccesSombre>{message}</SuccesSombre> : null}

      {/* ------------------------------------------------------ compteurs */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: t.total, v: stats.total },
          { label: t.septJours, v: stats.semaine },
          { label: t.aujourdhui, v: stats.jour },
        ].map((c) => (
          <div key={c.label} className="bo-panneau">
            <p className="bo-doux">{c.label}</p>
            <p className="bo-chiffre mt-1">{c.v.visites}</p>
            <p className="bo-doux">
              {c.v.visiteurs} {t.visiteursUniques}
            </p>
          </div>
        ))}
      </section>

      {/* -------------------------------------------- 14 derniers jours */}
      <section className="bo-panneau">
        <h2 className="mb-3 font-semibold">{t.quatorzeJours}</h2>
        <div className="flex h-40 items-end gap-1" role="img" aria-label={t.quatorzeJours}>
          {parJour.map((j) => (
            <div key={j.jour} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${j.jour} : ${j.visites} ${t.visites}, ${j.visiteurs} ${t.visiteursUniques}`}>
              <span className="text-xs tabular-nums text-bo-doux">{j.visites || ''}</span>
              <div className="w-full rounded-t bg-bo-menthe" style={{ height: `${Math.max(2, (j.visites / maxJour) * 100)}%` }} />
              <span className="text-[10px] text-bo-doux">{j.jour.slice(8)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {/* ------------------------------------------------- pages vues */}
        <div className="bo-panneau">
          <h2 className="mb-3 font-semibold">{t.pagesVues}</h2>
          {pages.length === 0 ? <p className="bo-doux">{fr.app.aucuneDonnee}</p> : <BarresPages lignes={pages} total={totalPages} />}
        </div>

        {/* -------------------------------------------------- visiteurs */}
        <div className="bo-panneau">
          <h2 className="mb-3 font-semibold">
            {t.visiteurs} <span className="bo-doux">({visiteurs.length})</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="bo-tableau">
              <thead>
                <tr>
                  <th>{t.visiteur}</th>
                  <th>{t.ip}</th>
                  <th>{t.pays}</th>
                  <th>{t.visites}</th>
                  <th>{t.atterrissage}</th>
                  <th>{t.derniereVisite}</th>
                </tr>
              </thead>
              <tbody>
                {visiteurs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-bo-doux">{fr.app.aucuneDonnee}</td>
                  </tr>
                ) : null}
                {visiteurs.map((v) => (
                  <tr key={v.visitorId}>
                    <td>
                      <Link href={`/admin/visites/${v.visitorId}`} className="font-mono text-xs hover:underline">
                        {v.visitorId.slice(0, 8)}
                      </Link>
                      {v.visites > 1 ? <span className="bo-puce ml-2 !border-bo-menthe/40 !text-bo-menthe">{t.revenu}</span> : null}
                    </td>
                    <td className="font-mono text-xs">{v.ip ?? '—'}</td>
                    <td>{v.country ?? '—'}</td>
                    <td className="tabular-nums">{v.visites}</td>
                    <td className="font-mono text-xs">{v.atterrissage}</td>
                    <td className="whitespace-nowrap">{formatDateTime(v.derniere)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
