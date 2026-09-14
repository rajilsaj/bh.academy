import Link from 'next/link'
import { count, desc, eq, isNull } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { learners } from '@/lib/db/schema'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AccueilCockpit() {
  const session = await auth()
  if (!session?.user?.role) redirect('/admin/login')

  const [apprenantsList, pendingCountResult, totalCount] = await Promise.all([
    db
      .select({ id: learners.id, email: learners.email, fullName: learners.fullName, validatedAt: learners.validatedAt, createdAt: learners.createdAt })
      .from(learners)
      .orderBy(desc(learners.createdAt)),
    db.select({ n: count() }).from(learners).where(isNull(learners.validatedAt)),
    db.select({ n: count() }).from(learners),
  ])

  const pendingCount = pendingCountResult[0]?.n || 0
  const total = totalCount[0]?.n || 0

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* Header with Sync Button */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-gray-900">Apprenants</h1>
          <p className="text-gray-600">Gestion de tous les apprenants</p>
        </div>
        <SyncButton />
      </div>

      {/* Sync Status Card */}
      <div className={`rounded-lg border-2 p-6 ${pendingCount > 0 ? 'border-orange-300 bg-orange-50' : 'border-green-300 bg-green-50'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-semibold ${pendingCount > 0 ? 'text-orange-900' : 'text-green-900'}`}>
              Synchronisation
            </p>
            <p className={`mt-2 text-2xl font-bold ${pendingCount > 0 ? 'text-orange-700' : 'text-green-700'}`}>
              {total} apprenants au total
            </p>
            <p className={`mt-1 text-sm ${pendingCount > 0 ? 'text-orange-700' : 'text-green-700'}`}>
              {pendingCount > 0
                ? `${pendingCount} en attente de validation`
                : 'Tous les apprenants sont validés'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-orange-600">{pendingCount}</p>
            <p className="text-xs text-gray-600 mt-2">en attente</p>
          </div>
        </div>
      </div>

      {/* Apprenants Table */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Nom</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Statut</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date d'ajout</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {apprenantsList.length > 0 ? (
              apprenantsList.map((apprenant) => (
                <tr key={apprenant.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{apprenant.fullName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{apprenant.email}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                      apprenant.validatedAt
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {apprenant.validatedAt ? '✓ Validé' : '◎ En attente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(apprenant.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-600">
                  <p className="text-lg">Aucun apprenant trouvé</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SyncButton() {
  return (
    <form action={async () => {
      'use server'
      try {
        const response = await fetch('/admin/api/trigger-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        if (response.ok) {
          console.log('Sync triggered successfully')
        }
      } catch (error) {
        console.error('Sync error:', error)
      }
    }}>
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-lg bg-bo-bleu px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 5.5a10 10 0 0 0-18.8 4.3" />
        </svg>
        Synchroniser
      </button>
    </form>
  )
}
