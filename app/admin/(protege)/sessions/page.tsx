import Link from 'next/link'
import { asc, eq } from 'drizzle-orm'
import { requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { sessions, cohorts } from '@/lib/db/schema'
import { formatDate } from '@/lib/format'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function SessionsPage() {
  const session = await requirePermission('voirModules')
  if (!session) redirect('/admin/login')

  const allSessions = await db
    .select()
    .from(sessions)
    .innerJoin(cohorts, eq(cohorts.id, sessions.cohortId))
    .orderBy(asc(sessions.heldOn))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">📅 Sessions</h1>
        <p className="mt-1 text-slate-600">Planifiez les sessions de formation</p>
      </div>

      <Link href="/admin/sessions" className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
        ➕ Créer une session
      </Link>

      <div className="space-y-2">
        {allSessions.map(({ sessions: s, cohorts: c }) => (
          <div key={s.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50">
            <div>
              <p className="font-semibold">{s.moduleName}</p>
              <p className="text-sm text-slate-600">{c.name}</p>
              <p className="text-xs text-slate-500">📅 {formatDate(new Date(s.heldOn))}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono bg-blue-100 text-blue-600 px-2 py-1 rounded">{s.dayCode}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
