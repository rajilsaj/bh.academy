import { requirePermission } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function UtilisateursPage() {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) redirect('/admin/login')

  return (
    <div className="p-6">
      <h1>Utilisateurs</h1>
      <p>Gérez tous les utilisateurs</p>
    </div>
  )
}
