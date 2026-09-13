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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">📊 Tableau de Bord</h1>
        <p className="mt-1 text-slate-600">Bienvenue dans le Cockpit IALAB</p>
      </div>

      {/* Quick Actions - Most Important */}
      {isAdmin && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            icon="📥"
            title="Importer les apprenants"
            description={enAttente.n > 0 ? `${enAttente.n} en attente de validation` : 'Synchroniser avec Google Forms'}
            href="/admin/utilisateurs"
            highlight={enAttente.n > 0}
          />
          <ActionCard
            icon="👨‍🏫"
            title="Ajouter un formateur"
            description="Créer un nouveau compte formateur"
            href="/admin/utilisateurs"
          />
          <ActionCard
            icon="📚"
            title="Créer un module"
            description="Ajouter une nouvelle formation"
            href="/admin/modules"
          />
        </section>
      )}

      {/* Stats - Overview */}
      <section>
        <h2 className="mb-4 text-lg font-bold">📈 Vue d'ensemble</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="👥 Apprenants" value={apprenants.n} detail={enAttente.n > 0 ? `${enAttente.n} en attente` : undefined} />
          <StatCard label="👨‍🏫 Formateurs" value={formateurs.n} />
          <StatCard label="📚 Modules" value={modules.n} />
          <StatCard label="📅 Prochaines sessions" value={prochaines.length} detail={enCours.length > 0 ? `${enCours.length} en cours` : undefined} />
        </div>
      </section>

      {/* Upcoming Sessions */}
      {prochaines.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold">📅 Prochaines sessions</h2>
          <div className="space-y-2">
            {prochaines.map((s) => (
              <div key={s.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{s.moduleName}</p>
                    <p className="text-sm text-slate-600">{formatDate(new Date(s.heldOn))} · {s.cohort}</p>
                  </div>
                  <div className="text-sm font-mono text-blue-600 font-semibold">{s.dayCode}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function ActionCard({ icon, title, description, href, highlight = false }: { icon: string; title: string; description: string; href: string; highlight?: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-lg border-2 p-4 transition-all ${
        highlight
          ? 'border-orange-300 bg-orange-50 hover:border-orange-400'
          : 'border-gray-200 bg-white hover:border-blue-300'
      }`}
    >
      <div className="text-3xl mb-2">{icon}</div>
      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      <div className="mt-3 flex items-center gap-1 text-sm font-semibold text-blue-600">
        Accéder →
      </div>
    </Link>
  )
}

function StatCard({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </div>
  )
}
