import { db } from '@/lib/db'
import { cohorts, learners } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { ApprenantsList } from '@/components/ApprenantsList'
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
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Apprenants</h1>
        <p className="mt-1 text-gray-600">Liste complète avec filtrage et actions</p>
      </div>
      <ApprenantsList initialData={apprenantsList} />
    </div>
  )
}
