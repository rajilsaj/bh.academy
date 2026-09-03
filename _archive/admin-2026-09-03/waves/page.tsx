import { asc, eq, sql as raw } from 'drizzle-orm'
import { AccesRefuse } from '@/components/AccesRefuse'
import { SuccesSombre } from '@/components/AccesRefuse'
import { requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { responses, waves } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { formatDateTime } from '@/lib/format'
import { fermerVague, ouvrirVague } from './actions'

export const dynamic = 'force-dynamic'

export default async function WavesPage({ searchParams }: { searchParams: { ok?: string } }) {
  const session = await requirePermission('gererVagues')
  if (!session) return <AccesRefuse />

  const rows = await db
    .select({
      id: waves.id,
      code: waves.code,
      labelFr: waves.labelFr,
      opensAt: waves.opensAt,
      closesAt: waves.closesAt,
      reponses: raw<number>`count(${responses.id})::int`,
    })
    .from(waves)
    .leftJoin(responses, eq(responses.waveId, waves.id))
    .groupBy(waves.id)
    .orderBy(asc(waves.code))

  const now = Date.now()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{fr.admin.waves.titre}</h1>
      {searchParams.ok === 'ouverte' ? <SuccesSombre>{fr.admin.waves.ouverte}</SuccesSombre> : null}
      {searchParams.ok === 'fermee' ? <SuccesSombre>{fr.admin.waves.fermee}</SuccesSombre> : null}
      <p className="text-sm text-bo-doux">{fr.admin.waves.confirmationFermer}</p>

      <div className="overflow-x-auto">
        <table className="bo-tableau">
          <thead>
            <tr>
              <th>{fr.admin.waves.code}</th>
              <th>{fr.admin.waves.libelle}</th>
              <th>{fr.admin.waves.statut}</th>
              <th>{fr.admin.waves.ouvertLe}</th>
              <th>{fr.admin.waves.fermeLe}</th>
              <th>{fr.admin.waves.reponses}</th>
              <th>{fr.app.action}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const ouverte =
                row.opensAt !== null &&
                row.opensAt.getTime() <= now &&
                (row.closesAt === null || row.closesAt.getTime() > now)
              const fermee = row.closesAt !== null && row.closesAt.getTime() <= now
              const statut = ouverte ? fr.app.ouverte : fermee ? fr.app.fermee : fr.app.aVenir

              return (
                <tr key={row.id}>
                  <td className="font-mono font-bold">{row.code}</td>
                  <td>{row.labelFr}</td>
                  <td>{statut}</td>
                  <td className="whitespace-nowrap">{formatDateTime(row.opensAt)}</td>
                  <td className="whitespace-nowrap">{formatDateTime(row.closesAt)}</td>
                  <td>{row.reponses}</td>
                  <td className="whitespace-nowrap">
                    {ouverte ? (
                      <form action={fermerVague}>
                        <input type="hidden" name="waveId" value={row.id} />
                        <button type="submit" className="bo-bouton-discret">
                          {fr.admin.waves.fermer}
                        </button>
                      </form>
                    ) : (
                      <form action={ouvrirVague}>
                        <input type="hidden" name="waveId" value={row.id} />
                        <button type="submit" className="bo-bouton-discret">
                          {fr.admin.waves.ouvrir}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
