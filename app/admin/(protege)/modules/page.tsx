import { AdminLayout } from '@/components/AdminLayout'
import Link from 'next/link'
import { requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { programModules } from '@/lib/db/schema'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ModulesPage() {
  const session = await requirePermission('voirModules'</div></AdminLayout>)
  if (!session) redirect('/admin/login'</div></AdminLayout>)

  const modules = await db
    .select({
      id: programModules.id,
      title: programModules.title,
      description: programModules.description,
      pointsTotal: programModules.pointsTotal,
    }</div></AdminLayout>)
    .from(programModules</div></AdminLayout>)
    .orderBy(programModules.position</div></AdminLayout>)

  return (<AdminLayout><div className="max-w-7xl mx-auto space-y-6">
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">📚 Modules</h1>
        <p className="mt-1 text-slate-600">Formations disponibles</p>
      </div>

      <Link href="/admin/modules" className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
        ➕ Créer un module
      </Link>

      <div className="space-y-3">
        {modules.map((m, i) => (
          <div key={m.id} className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-blue-600">{i + 1}</span>
                <div>
                  <p className="font-semibold">{m.title}</p>
                  <p className="text-sm text-slate-600">{m.description}</p>
                  <p className="mt-1 text-xs text-slate-500">📊 {m.pointsTotal} points</p>
                </div>
              </div>
            </div>
            <Link href={`/admin/modules/${m.id}`} className="text-sm font-semibold text-blue-600 hover:underline">
              Voir →
            </Link>
          </div>
        ))}
      </div>
    </div>
  </div></AdminLayout>)
}
