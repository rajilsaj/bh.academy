import Link from 'next/link'
import { and, asc, count, eq, gte, isNull } from 'drizzle-orm'
import { auth, can } from '@/lib/auth'
import { db } from '@/lib/db'
import { cohorts, learners, programModules, sessions, staff } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { formatDate } from '@/lib/format'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AccueilCockpit() {
  const session = await auth()
  if (!session?.user?.role) redirect('/admin/login')
  const role = session.user.role
  const isAdmin = can(role, 'gererUtilisateurs')

  const maintenant = new Date()
  const [[apprenants], [enAttente], [formateurs], [modules], prochaines] = await Promise.all([
    db.select({ n: count() }).from(learners),
    db.select({ n: count() }).from(learners).where(isNull(learners.validatedAt)),
    db.select({ n: count() }).from(staff).where(eq(staff.role, 'formateur')),
    db.select({ n: count() }).from(programModules),
    db
      .select({
        id: sessions.id,
        moduleName: sessions.moduleName,
        heldOn: sessions.heldOn,
        opensAt: sessions.opensAt,
        closesAt: sessions.closesAt,
        dayCode: sessions.dayCode,
        cohort: cohorts.name,
      })
      .from(sessions)
      .innerJoin(cohorts, eq(cohorts.id, sessions.cohortId))
      .where(and(gte(sessions.closesAt, maintenant)))
      .orderBy(asc(sessions.opensAt))
      .limit(5),
  ])

  const enCours = prochaines.filter((s) => s.opensAt <= maintenant && s.closesAt >= maintenant)

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-gray-900">Tableau de Bord</h1>
        <p className="text-gray-600">Aperçu de votre plateforme</p>
      </div>

      {/* Quick Actions */}
      {isAdmin && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Actions rapides</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ActionCard
              title="Importer les apprenants"
              description={enAttente.n > 0 ? `${enAttente.n} en attente de validation` : 'Synchroniser avec Google Forms'}
              href="/admin/utilisateurs"
              highlight={enAttente.n > 0}
              icon="↓"
            />
            <ActionCard
              title="Ajouter un formateur"
              description="Créer un nouveau compte formateur"
              href="/admin/utilisateurs"
              icon="+"
            />
            <ActionCard
              title="Créer un module"
              description="Ajouter une nouvelle formation"
              href="/admin/modules"
              icon="+"
            />
          </div>
        </section>
      )}

      {/* Stats Overview */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Vue d'ensemble</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Apprenants" value={apprenants.n} detail={enAttente.n > 0 ? `${enAttente.n} en attente` : undefined} />
          <StatCard label="Formateurs" value={formateurs.n} />
          <StatCard label="Modules" value={modules.n} />
          <StatCard label="Sessions" value={prochaines.length} detail={enCours.length > 0 ? `${enCours.length} en cours` : undefined} />
        </div>
      </section>

      {/* Upcoming Sessions */}
      {prochaines.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Prochaines sessions</h2>
          <div className="space-y-3">
            {prochaines.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">{s.moduleName}</p>
                  <p className="text-sm text-gray-600">{formatDate(new Date(s.heldOn))} · {s.cohort}</p>
                </div>
                <div className="ml-4 font-mono text-sm font-semibold text-bo-bleu">{s.dayCode}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function ActionCard({
  title,
  description,
  href,
  highlight = false,
  icon = '→'
}: {
  title: string
  description: string
  href: string
  highlight?: boolean
  icon?: string
}) {
  return (
    <Link
      href={href}
      className={`group relative flex flex-col gap-3 rounded-lg border p-6 transition-all ${
        highlight
          ? 'border-orange-200 bg-orange-50 hover:border-orange-300 hover:shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        </div>
        <div className={`ml-3 text-lg font-semibold transition-colors ${
          highlight ? 'text-orange-600 group-hover:text-orange-700' : 'text-gray-400 group-hover:text-gray-600'
        }`}>
          {icon}
        </div>
      </div>
    </Link>
  )
}

function StatCard({
  label,
  value,
  detail
}: {
  label: string
  value: number
  detail?: string
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 hover:border-gray-300 transition-colors">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {detail && <p className="mt-2 text-xs text-gray-600">{detail}</p>}
    </div>
  )
}
