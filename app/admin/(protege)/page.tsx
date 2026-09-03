import { redirect } from 'next/navigation'
import { auth, can } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** L'accueil du back-office est la première page utile du rôle. */
export default async function AccueilAdmin() {
  const session = await auth()
  if (!session?.user?.role) redirect('/admin/login')
  redirect(can(session.user.role, 'gererUtilisateurs') ? '/admin/utilisateurs' : '/admin/modules')
}
