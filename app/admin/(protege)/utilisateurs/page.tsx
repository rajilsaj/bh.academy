import Link from 'next/link'
import { asc, count, desc, eq, isNull, isNotNull } from 'drizzle-orm'
import { SyncLearnersButton } from '@/components/SyncLearnersButton'
import { LearnersList } from '@/components/LearnersList'
import { DocumentUpload } from '@/components/DocumentUpload'
import { SyncMonitor } from '@/components/SyncMonitor'
import { requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { learners, staff } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { redirect } from 'next/navigation'
import '@/styles/design-system.css'

export const dynamic = 'force-dynamic'

export default async function UtilisateursPageSimple({
  searchParams,
}: {
  searchParams: { tab?: string; search?: string; fiche?: string; gender?: string; status?: string; city?: string }
}) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) redirect('/admin/login')

  const tab = (searchParams.tab || 'apprenants') as 'apprenants' | 'attente' | 'admins' | 'formateurs'
  const search = searchParams.search?.toLowerCase() || ''
  const ficheId = searchParams.fiche
  const filterGender = searchParams.gender || ''
  const filterStatus = searchParams.status || ''
  const filterCity = searchParams.city || ''

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
      .where(isNotNull(learners.validatedAt))
      .orderBy(desc(learners.createdAt))
  } else if (tab === 'attente') {
    data = await db
      .select()
      .from(learners)
      .where(isNull(learners.validatedAt))
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

  // Filter by search and facets
  if (search) {
    data = data.filter((item: any) => {
      const text = `${item.fullName || item.email}`.toLowerCase()
      return text.includes(search)
    })
  }
  if (filterGender) {
    data = data.filter((item: any) => item.gender === filterGender)
  }
  if (filterStatus) {
    data = data.filter((item: any) => item.status === filterStatus)
  }
  if (filterCity) {
    data = data.filter((item: any) => item.city === filterCity)
  }

  // Get unique filter options from current tab data
  const genderOptions = [...new Set(data.map((d: any) => d.gender).filter(Boolean))].sort()
  const statusOptions = [...new Set(data.map((d: any) => d.status).filter(Boolean))].sort()
  const cityOptions = [...new Set(data.map((d: any) => d.city).filter(Boolean))].sort()

  const tabs = [
    { id: 'apprenants', label: `👥 Apprenants (${totalApprenants.n})`, count: totalApprenants.n },
    { id: 'attente', label: `⏳ En attente (${enAttente.n})`, count: enAttente.n, highlight: enAttente.n > 0 },
    { id: 'admins', label: `🔐 Admins (${admins.n})`, count: admins.n },
    { id: 'formateurs', label: `👨‍🏫 Formateurs (${formateurs.n})`, count: formateurs.n },
  ]

  // Get detail view data if fiche param is set
  let detailItem: any = null
  if (ficheId) {
    const [item] = await db.select().from(learners).where(eq(learners.id, ficheId))
    detailItem = item
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">👥 Utilisateurs</h1>
          <p className="mt-2 text-gray-600">Gérez tous les utilisateurs de la plateforme</p>
        </div>

        {/* Sync Monitor */}
        <SyncMonitor />

        {/* Import Banner */}
        <div className="ds-card bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-l-indigo-600">
          <div className="p-6 flex items-start justify-between gap-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">📥 Importer les apprenants</h3>
              <p className="mt-1 text-sm text-gray-600">Synchronisez avec votre formulaire Google automatiquement</p>
            </div>
            <div className="shrink-0">
              <SyncLearnersButton />
            </div>
          </div>
        </div>

      {/* Tabs */}
      <div className="ds-card">
        <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={`/admin/utilisateurs?tab=${t.id}`}
              className={`px-4 py-3 border-b-2 font-semibold transition-all whitespace-nowrap ${
                tab === t.id
                  ? 'border-b-indigo-600 text-indigo-600'
                  : `border-b-transparent text-gray-600 ${t.highlight ? 'text-orange-600' : ''}`
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
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

        {/* Filters */}
        <form method="get" className="grid grid-cols-4 gap-2">
          <input type="hidden" name="tab" value={tab} />
          <input type="hidden" name="search" value={search} />

          {genderOptions.length > 0 && (
            <select name="gender" defaultValue={filterGender} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">Tous les genres</option>
              {genderOptions.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          )}

          {statusOptions.length > 0 && (
            <select name="status" defaultValue={filterStatus} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">Tous les statuts</option>
              {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          {cityOptions.length > 0 && (
            <select name="city" defaultValue={filterCity} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">Toutes les villes</option>
              {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          <button type="submit" className="rounded-lg bg-gray-600 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-700">
            Filtrer
          </button>
        </form>
      </div>

      {/* List with Bulk Selection */}
      <LearnersList items={data} tab={tab} />

      {/* Detail Modal */}
      {ficheId && detailItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white p-6">
              <h2 className="text-2xl font-bold">{detailItem.fullName}</h2>
              <Link
                href={`/admin/utilisateurs?tab=${tab}`}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </Link>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold">{detailItem.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Téléphone</p>
                  <p className="font-semibold">{detailItem.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Statut</p>
                  <p className="font-semibold">{detailItem.status || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Genre</p>
                  <p className="font-semibold">{detailItem.gender || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date de naissance</p>
                  <p className="font-semibold">{detailItem.dateOfBirth || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Ville</p>
                  <p className="font-semibold">{detailItem.city || '—'}</p>
                </div>
              </div>

              {/* Documents */}
              <div className="border-t pt-4">
                <h3 className="font-bold mb-4">📄 Documents</h3>
                <div className="space-y-4">
                  {/* ID Document */}
                  <div className="border rounded-lg p-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Document d'identité</p>
                    {detailItem.idDocumentUrl && (
                      <a href={detailItem.idDocumentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm block mb-2">
                        ✅ Voir le document stocké
                      </a>
                    )}
                    <DocumentUpload learnerId={detailItem.id} docType="id" />
                  </div>

                  {/* CV */}
                  <div className="border rounded-lg p-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">CV</p>
                    {detailItem.cvUrl && (
                      <a href={detailItem.cvUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm block mb-2">
                        ✅ Voir le CV stocké
                      </a>
                    )}
                    <DocumentUpload learnerId={detailItem.id} docType="cv" />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600">Statut d'approbation</p>
                {detailItem.validatedAt ? (
                  <p className="text-green-600 font-semibold">✅ Approuvé</p>
                ) : (
                  <p className="text-orange-600 font-semibold">⏳ En attente</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
