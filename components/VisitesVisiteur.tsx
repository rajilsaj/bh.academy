import Link from 'next/link'
import { fr } from '@/lib/i18n/fr'
import { formatDateTime } from '@/lib/format'
import type { detailVisiteur } from '@/lib/visites'

const t = fr.admin.visites

type Detail = NonNullable<Awaited<ReturnType<typeof detailVisiteur>>>

/** Barres horizontales : la part de chaque page dans les visites de la personne. */
export function BarresPages({ lignes, total }: { lignes: { path: string; visites: number }[]; total: number }) {
  return (
    <ul className="space-y-2">
      {lignes.map((l) => {
        const part = total > 0 ? l.visites / total : 0
        return (
          <li key={l.path} className="text-sm">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="truncate font-mono text-xs" title={l.path}>{l.path}</span>
              <span className="shrink-0 tabular-nums">
                {l.visites} <span className="bo-doux">({Math.round(part * 100)} %)</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bo-panneau-2">
              <div className="h-full rounded-full bg-bo-menthe" style={{ width: `${Math.max(2, part * 100)}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * La fiche d'un visiteur : ses adresses, ses pages, sa chronologie, et le
 * bouton pour effacer ce qu'on a gardé de lui.
 */
export function VisitesVisiteur({
  visitorId,
  detail,
  supprimer,
}: {
  visitorId: string
  detail: Detail
  supprimer: (formData: FormData) => Promise<void>
}) {
  const total = Number(detail.total)
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="bo-doux">
            <Link href="/admin/visites" className="underline">{t.titre}</Link>
          </p>
          <h1 className="text-xl font-bold">
            {t.visiteur} <span className="font-mono text-base text-bo-doux">{visitorId.slice(0, 8)}</span>
          </h1>
          <p className="mt-1 text-sm text-bo-doux">
            {t.premiereVisite} {formatDateTime(detail.premiere!)} · {t.derniereVisite} {formatDateTime(detail.derniere!)}
          </p>
        </div>
        <form action={supprimer}>
          <input type="hidden" name="visitorId" value={visitorId} />
          <button type="submit" className="bo-bouton-discret !border-bo-rose/50 !text-bo-rose">{t.supprimerVisiteur}</button>
        </form>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="bo-panneau">
          <p className="bo-chiffre">{total}</p>
          <p className="bo-doux">{t.visitesTotal}</p>
        </div>
        <div className="bo-panneau">
          <p className="bo-chiffre">{detail.parPage.length}</p>
          <p className="bo-doux">{t.pagesDistinctes}</p>
        </div>
        <div className="bo-panneau">
          <p className="bo-chiffre">{detail.adresses.length}</p>
          <p className="bo-doux">{t.adressesDistinctes}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="bo-panneau">
          <h2 className="mb-3 font-semibold">{t.ouIlAtterrit}</h2>
          <BarresPages lignes={detail.parPage} total={total} />
        </div>
        <div className="bo-panneau">
          <h2 className="mb-3 font-semibold">{t.adresses}</h2>
          <div className="overflow-x-auto">
            <table className="bo-tableau">
              <thead>
                <tr>
                  <th>{t.ip}</th>
                  <th>{t.pays}</th>
                  <th>{t.visites}</th>
                  <th>{t.derniereVisite}</th>
                </tr>
              </thead>
              <tbody>
                {detail.adresses.map((a) => (
                  <tr key={`${a.ip}-${a.city}`}>
                    <td className="font-mono text-xs">{a.ip ?? '—'}</td>
                    <td>{[a.city, a.country].filter(Boolean).join(', ') || '—'}</td>
                    <td className="tabular-nums">{Number(a.visites)}</td>
                    <td className="whitespace-nowrap">{a.derniere ? formatDateTime(a.derniere) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="bo-doux mt-3 break-all text-xs">{detail.userAgent}</p>
        </div>
      </section>

      <section className="bo-panneau">
        <h2 className="mb-3 font-semibold">{t.chronologie}</h2>
        <div className="overflow-x-auto">
          <table className="bo-tableau">
            <thead>
              <tr>
                <th>{fr.app.date}</th>
                <th>{t.page}</th>
                <th>{t.provenance}</th>
                <th>{t.ip}</th>
              </tr>
            </thead>
            <tbody>
              {detail.liste.map((v) => (
                <tr key={v.id}>
                  <td className="whitespace-nowrap">{formatDateTime(v.createdAt)}</td>
                  <td className="font-mono text-xs">{v.path}</td>
                  <td className="break-all text-xs">{v.referer ?? '—'}</td>
                  <td className="font-mono text-xs">{v.ip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
