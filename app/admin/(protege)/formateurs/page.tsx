import { AdminLayout } from '@/components/AdminLayout'
import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { staff, trainerProfiles, TRAINER_CITIES } from '@/lib/db/schema'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function FormateursPage({ searchParams }: { searchParams: { city?: string } }) {
  const session = await requirePermission('gererUtilisateurs'</div></AdminLayout>)
  if (!session) redirect('/admin/login'</div></AdminLayout>)

  const selectedCity = searchParams.city as any

  let formateurs = await db
    .select(</div></AdminLayout>)
    .from(staff</div></AdminLayout>)
    .where(eq(staff.role, 'formateur')</div></AdminLayout>)

  if (selectedCity && TRAINER_CITIES.includes(selectedCity)) {
    const profiles = await db.select().from(trainerProfiles).where(eq(trainerProfiles.city, selectedCity)</div></AdminLayout>)
    formateurs = formateurs.filter(f => profiles.some(p => p.staffId === f.id)</div></AdminLayout>)
  }

  return (<AdminLayout><div className="max-w-7xl mx-auto space-y-6">
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">👨‍🏫 Formateurs</h1>
        <p className="mt-1 text-slate-600">Gérez vos formateurs</p>
      </div>

      <Link href="/admin/utilisateurs?tab=formateurs" className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
        ➕ Ajouter un formateur
      </Link>

      {TRAINER_CITIES && (
        <div className="flex gap-2">
          {Object.entries(TRAINER_CITIES).map(([key, label]) => (
            <Link
              key={key}
              href={`/admin/formateurs?city=${key}`}
              className={`px-4 py-2 rounded-lg font-semibold ${
                selectedCity === key ? 'bg-blue-600 text-white' : 'bg-gray-200 text-slate-900 hover:bg-gray-300'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {formateurs.map((f) => (
          <div key={f.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
            <div>
              <p className="font-semibold">{f.email}</p>
            </div>
            <Link href={`/admin/formateurs?edit=${f.id}`} className="text-sm font-semibold text-blue-600 hover:underline">
              Voir →
            </Link>
          </div>
        ))}
      </div>
    </div>
  </div></AdminLayout>)
}
