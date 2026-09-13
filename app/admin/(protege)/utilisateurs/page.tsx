import Link from 'next/link'
import { asc, count, desc, eq, isNull } from 'drizzle-orm'
import { SyncLearnersButton } from '@/components/SyncLearnersButton'
import { requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { learners, staff } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function UtilisateursPageSimple({
  searchParams,
}: {
  searchParams: { tab?: string; search?: string }
}) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) redirect('/admin/login')

  const tab = (searchParams.tab || 'apprenants') as 'apprenants' | 'attente' | 'admins' | 'formateurs'
  const search = searchParams.search?.toLowerCase() || ''

  // Get counts
  const [[totalApprenants], [enAttente], [admins], [formateurs]] = await Promise.all([
    db.select({ n: count() }).from(learners),
    db.select({ n: count() }).from(learners).where(isNull(learners.validatedAt)),
    db.select({ n: count() }).from(staff).where(eq(staff.role, 'admin')),
    db.select({ n: count() }).from(staff).where(eq(staff.role, 'formateur')),
  ])

  // Get data based on tab
  let data: any[] = []
  if (tab === 'apprenants') {
    data = await db
      .select()
      .from(learners)
      .where(isNull(learners.validatedAt) === false)
      .orderBy(desc(learners.createdAt))
  } else if (tab === 'attente') {
    data = await db
      .select()
      .from(learners)
      .where(isNull(learners.validatedAt) === true)
      .orderBy(desc(learners.createdAt))
  } else if (tab === 'admins') {
    data = await db
      .select()
      .from(staff)
      .where(eq(staff.role, 'admin'))
      .orderBy(asc(staff.email))
  } else if (tab === 'formateurs') {
    data = await db
      .select()
      .from(staff)
      .where(eq(staff.role, 'formateur'))
      .orderBy(asc(staff.email))
  }

  // Filter by search
  if (search) {
    data = data.filter((item: any) => {
      const text = `${item.fullName || item.email}`.toLowerCase()
      return text.includes(search)
    })
  }

  const tabs = [
    { id: 'apprenants', label: `👥 Apprenants (${totalApprenants.n})`, count: totalApprenants.n },
    { id: 'attente', label: `⏳ En attente (${enAttente.n})`, count: enAttente.n, highlight: enAttente.n > 0 },
    { id: 'admins', label: `🔐 Admins (${admins.n})`, count: admins.n },
    { id: 'formateurs', label: `👨‍🏫 Formateurs (${formateurs.n})`, count: formateurs.n },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">👥 Utilisateurs</h1>
        <p className="mt-1 text-slate-600">Gérez tous les utilisateurs de la plateforme</p>
      </div>

      {/* Import Banner */}
      <div className="rounded-lg border-l-4 border-l-blue-500 bg-blue-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900">📥 Importer les apprenants</h3>
            <p className="mt-1 text-sm text-slate-600">Synchronisez avec votre formulaire Google</p>
          </div>
          <div className="shrink-0 w-32">
            <SyncLearnersButton />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/admin/utilisateurs?tab=${t.id}`}
            className={`px-4 py-3 border-b-2 font-semibold transition-all whitespace-nowrap ${
              tab === t.id
                ? 'border-b-blue-500 text-blue-600'
                : `border-b-transparent text-slate-600 ${t.highlight ? 'text-orange-600' : ''}`
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Search */}
      <form method="get" className="flex gap-2">
        <input
          type="hidden"
          name="tab"
          value={tab}
        />
        <input
          type="text"
          name="search"
          placeholder="Chercher par nom ou email..."
          defaultValue={search}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          🔍
        </button>
      </form>

      {/* List */}
      <div className="space-y-2">
        {data.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-slate-600">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          data.map((item: any) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50"
            >
              <div>
                <p className="font-semibold">{item.fullName || item.email}</p>
                <p className="text-sm text-slate-600">{item.email}</p>
                {item.phone && <p className="text-xs text-slate-500">📞 {item.phone}</p>}
              </div>
              <div className="flex items-center gap-2">
                {item.validatedAt ? (
                  <span className="text-xs font-semibold text-green-600">✅ Approuvé</span>
                ) : (
                  <span className="text-xs font-semibold text-orange-600">⏳ Attente</span>
                )}
                <Link
                  href={`/admin/utilisateurs?fiche=${item.id}`}
                  className="rounded px-3 py-1 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                >
                  Voir
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
