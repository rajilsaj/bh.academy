import { db } from '@/lib/db'
import { cohorts, learners } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { ApprenantsList } from '@/components/ApprenantsList'
import { SyncButton } from '@/components/SyncButton'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function ApprenantsPage() {
  const session = await auth()
  if (!session?.user?.role) redirect('/admin/login')

  const apprenantsList = await db
    .select({
      id: learners.id,
      fullName: learners.fullName,
      email: learners.email,
      phone: learners.phone,
      city: learners.city,
      status: learners.status,
      gender: learners.gender,
      dateOfBirth: learners.dateOfBirth,
      validatedAt: learners.validatedAt,
      createdAt: learners.createdAt,
      formSubmittedAt: learners.formSubmittedAt,
      cohortId: learners.cohortId,
      consentCommunity: learners.consentCommunity,
      consentData: learners.consentData,
      cvUrl: learners.cvUrl,
      idDocumentUrl: learners.idDocumentUrl,
    })
    .from(learners)
    .leftJoin(cohorts, eq(learners.cohortId, cohorts.id))

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Apprenants</h1>
          <p className="mt-1 text-gray-600">Gestion et synchronisation de la liste complète</p>
        </div>
      </div>

      {/* Sync Section */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-gray-900">Synchroniser avec Google Sheets</h3>
            <p className="mt-1 text-sm text-gray-600">
              Importez les dernières données depuis Google Sheets et Google Drive
            </p>
          </div>
          <SyncButton />
        </div>
      </div>

      {/* Apprenants List */}
      <ApprenantsList initialData={apprenantsList} />
    </div>
  )
}
