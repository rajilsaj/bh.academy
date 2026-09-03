import Link from 'next/link'
import { asc, desc, eq, sql as raw } from 'drizzle-orm'
import { AccesRefuse, AlerteSombre, SuccesSombre } from '@/components/AccesRefuse'
import { can, requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { cohorts, programModules, programs } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { formatDate } from '@/lib/format'
import { creerFormation } from './actions'

export const dynamic = 'force-dynamic'

const t = fr.admin.formations

export default async function FormationsPage({ searchParams }: { searchParams: { ok?: string; e?: string } }) {
  const session = await requirePermission('voirModules')
  if (!session) return <AccesRefuse />
  const peutModifier = can(session.user.role, 'gererFormations')

  const liste = await db
    .select({
      id: programs.id,
      name: programs.name,
      startsOn: programs.startsOn,
      endsOn: programs.endsOn,
      expectedLearners: programs.expectedLearners,
      partner: programs.partner,
      modules: raw<number>`(select count(*) from ${programModules} m where m.program_id = ${programs.id})::int`,
      promotions: raw<number>`(select count(*) from ${cohorts} c where c.program_id = ${programs.id})::int`,
    })
    .from(programs)
    .orderBy(desc(programs.startsOn), asc(programs.name))

  const messageOk = searchParams.ok ? t.messages[searchParams.ok as keyof typeof t.messages] : null
  const messageErreur = searchParams.e ? t.messages[searchParams.e as keyof typeof t.messages] : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">{t.titre}</h1>
        <p className="mt-1 text-sm text-bo-doux">{t.sousTitre}</p>
      </div>
      {messageOk ? <SuccesSombre>{messageOk}</SuccesSombre> : null}
      {messageErreur ? <AlerteSombre>{messageErreur}</AlerteSombre> : null}

      <section className="bo-panneau">
        <div className="overflow-x-auto">
          <table className="bo-tableau">
            <thead>
              <tr>
                <th>{t.nom}</th>
                <th>{t.colonnePeriode}</th>
                <th>{t.colonneModules}</th>
                <th>{t.colonneApprenants}</th>
                <th>{t.partenaire}</th>
                <th>{t.promotions}</th>
              </tr>
            </thead>
            <tbody>
              {liste.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-bo-doux">{fr.app.aucuneDonnee}</td>
                </tr>
              ) : null}
              {liste.map((f) => (
                <tr key={f.id}>
                  <td>
                    <Link href={`/admin/modules/${f.id}`} className="font-medium hover:underline">{f.name}</Link>
                  </td>
                  <td className="whitespace-nowrap">
                    {f.startsOn ? formatDate(f.startsOn) : '—'} → {f.endsOn ? formatDate(f.endsOn) : '—'}
                  </td>
                  <td className="tabular-nums">{f.modules}</td>
                  <td className="tabular-nums">{f.expectedLearners ?? '—'}</td>
                  <td>{f.partner ?? '—'}</td>
                  <td className="tabular-nums">{f.promotions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {!peutModifier ? <p className="bo-doux">{t.lectureSeule}</p> : null}

      {peutModifier ? (
      <section className="bo-panneau">
        <h2 className="mb-3 font-semibold">{t.creer}</h2>
        <form action={creerFormation} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="bo-doux mb-1 block" htmlFor="name">{t.nom}</label>
            <input id="name" name="name" required maxLength={200} className="bo-champ" />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="bo-doux mb-1 block" htmlFor="description">{t.description}</label>
            <textarea id="description" name="description" rows={3} maxLength={2000} className="bo-champ" />
          </div>
          <div>
            <label className="bo-doux mb-1 block" htmlFor="startsOn">{t.debut}</label>
            <input id="startsOn" name="startsOn" type="date" className="bo-champ" />
          </div>
          <div>
            <label className="bo-doux mb-1 block" htmlFor="endsOn">{t.fin}</label>
            <input id="endsOn" name="endsOn" type="date" className="bo-champ" />
          </div>
          <div>
            <label className="bo-doux mb-1 block" htmlFor="schedule">{t.horaires}</label>
            <input id="schedule" name="schedule" maxLength={200} placeholder="Ex. : jeudi, 9 h – 12 h" className="bo-champ" />
          </div>
          <div>
            <label className="bo-doux mb-1 block" htmlFor="expectedLearners">{t.apprenantsAttendus}</label>
            <input id="expectedLearners" name="expectedLearners" type="number" min={0} className="bo-champ" />
          </div>
          <div>
            <label className="bo-doux mb-1 block" htmlFor="partner">{t.partenaire}</label>
            <input id="partner" name="partner" maxLength={200} className="bo-champ" />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="bo-doux mb-1 block" htmlFor="expectations">{t.attentes}</label>
            <textarea id="expectations" name="expectations" rows={3} maxLength={2000} className="bo-champ" />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <button type="submit" className="bo-bouton">{t.creer}</button>
          </div>
        </form>
      </section>
      ) : null}
    </div>
  )
}
