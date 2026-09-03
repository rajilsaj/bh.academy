import Link from 'next/link'
import { asc } from 'drizzle-orm'
import { AccesRefuse } from '@/components/AccesRefuse'
import { Jauge } from '@/components/Progression'
import { requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { cohorts } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { formatDate, formatPercent } from '@/lib/format'
import { getCohortProgress } from '@/lib/queries'
import { delivrerCertificat } from './actions'

export const dynamic = 'force-dynamic'

export default async function CertificatsPage({
  searchParams,
}: {
  searchParams: { ok?: string; e?: string }
}) {
  const session = await requirePermission('gererResultats')
  if (!session) return <AccesRefuse />

  const [cohorte] = await db.select().from(cohorts).orderBy(asc(cohorts.startsOn)).limit(1)
  const progression = await getCohortProgress(cohorte?.id)

  const delivres = progression.filter((p) => p.certificat_code)
  const eligibles = progression.filter((p) => p.eligible && !p.certificat_code)
  const autres = progression.filter((p) => !p.eligible && !p.certificat_code)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold">{fr.backoffice.certificats}</h1>
        <p className="bo-doux">{cohorte?.name}</p>
      </div>

      {searchParams.ok ? (
        <p className="rounded-xl border border-bo-menthe/40 bg-bo-menthe/10 px-4 py-3 text-sm text-bo-menthe">
          {fr.backoffice.certificatDelivre}
        </p>
      ) : null}
      {searchParams.e ? (
        <p className="rounded-xl border border-bo-rose/40 bg-bo-rose/10 px-4 py-3 text-sm text-bo-rose">
          {fr.backoffice.nonEligible}
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="bo-panneau">
          <p className="bo-chiffre">{delivres.length}</p>
          <p className="bo-doux mt-1">{fr.backoffice.certificatsDelivres}</p>
        </div>
        <div className="bo-panneau">
          <p className="bo-chiffre text-bo-menthe">{eligibles.length}</p>
          <p className="bo-doux mt-1">{fr.backoffice.eligibles}</p>
        </div>
        <div className="bo-panneau">
          <p className="bo-chiffre text-bo-doux">{autres.length}</p>
          <p className="bo-doux mt-1">{fr.backoffice.nonEligible}</p>
        </div>
      </section>

      {/* ------------------------------------------------------- à délivrer */}
      <section className="bo-panneau">
        <h2 className="bo-titre mb-3">{fr.backoffice.eligibles}</h2>
        {eligibles.length === 0 ? (
          <p className="bo-doux">{fr.backoffice.aucunEligible}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="bo-tableau">
              <thead>
                <tr>
                  <th>{fr.backoffice.colonneApprenant}</th>
                  <th>{fr.backoffice.colonneAvancement}</th>
                  <th>{fr.backoffice.colonneModules}</th>
                  <th>{fr.app.action}</th>
                </tr>
              </thead>
              <tbody>
                {eligibles.map((p) => (
                  <tr key={p.learner_id}>
                    <td>
                      <Link href={`/admin/learners/${p.learner_id}`} className="hover:underline">
                        {p.full_name}
                      </Link>
                      <span className="bo-doux block">{p.learner_id}</span>
                    </td>
                    <td className="w-56">
                      <div className="flex items-center gap-2">
                        <Jauge valeur={Number(p.avancement ?? 0)} statut="termine" className="flex-1" />
                        <span className="w-12 text-right text-xs tabular-nums">
                          {formatPercent(p.avancement)}
                        </span>
                      </div>
                    </td>
                    <td className="tabular-nums">
                      {p.modules_termines}/{p.modules_total}
                    </td>
                    <td>
                      <form action={delivrerCertificat}>
                        <input type="hidden" name="learnerId" value={p.learner_id} />
                        <button type="submit" className="bo-bouton">
                          {fr.backoffice.delivrer}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* --------------------------------------------------------- délivrés */}
      <section className="bo-panneau">
        <h2 className="bo-titre mb-3">{fr.backoffice.certificatsDelivres}</h2>
        {delivres.length === 0 ? (
          <p className="bo-doux">{fr.app.aucuneDonnee}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="bo-tableau">
              <thead>
                <tr>
                  <th>{fr.backoffice.colonneApprenant}</th>
                  <th>{fr.certificat.code}</th>
                  <th>{fr.certificat.delivreLe}</th>
                  <th>{fr.certificat.avancement}</th>
                </tr>
              </thead>
              <tbody>
                {delivres.map((p) => (
                  <tr key={p.learner_id}>
                    <td>
                      <Link href={`/admin/learners/${p.learner_id}`} className="hover:underline">
                        {p.full_name}
                      </Link>
                      <span className="bo-doux block">{p.learner_id}</span>
                    </td>
                    <td>
                      <Link
                        href={`/certificat/${p.certificat_code}`}
                        className="font-mono text-xs text-bo-menthe hover:underline"
                      >
                        {p.certificat_code}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap">{formatDate(p.certificat_le)}</td>
                    <td className="tabular-nums">{formatPercent(p.avancement)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
