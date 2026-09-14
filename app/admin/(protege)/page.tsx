import Link from 'next/link'
import { and, asc, count, desc, eq, isNull } from 'drizzle-orm'
import { auth, can } from '@/lib/auth'
import { db } from '@/lib/db'
import { learners, staff } from '@/lib/db/schema'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AccueilCockpit() {
  const session = await auth()
  if (!session?.user?.role) redirect('/admin/login')
  const role = session.user.role
  const isAdmin = can(role, 'gererUtilisateurs')

  const [adminsList, formateursList, apprenantsList, pendingCount] = await Promise.all([
    db
      .select({ id: staff.id, email: staff.email, role: staff.role, createdAt: staff.createdAt })
      .from(staff)
      .where(eq(staff.role, 'admin'))
      .orderBy(desc(staff.createdAt))
      .limit(10),
    db
      .select({ id: staff.id, email: staff.email, role: staff.role, createdAt: staff.createdAt })
      .from(staff)
      .where(eq(staff.role, 'formateur'))
      .orderBy(desc(staff.createdAt))
      .limit(10),
    db
      .select({ id: learners.id, email: learners.email, firstName: learners.firstName, lastName: learners.lastName, validatedAt: learners.validatedAt, createdAt: learners.createdAt })
      .from(learners)
      .orderBy(desc(learners.createdAt))
      .limit(10),
    db.select({ n: count() }).from(learners).where(isNull(learners.validatedAt)),
  ])

  const [[pendingCount_n]] = await Promise.all([pendingCount])

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="space-y-2 border-b border-gray-200 pb-6">
        <h1 className="text-4xl font-bold text-gray-900">Tableau de Bord</h1>
        <p className="text-gray-600">Gestion centralisée de votre plateforme</p>
      </div>

      {/* Quick Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm font-semibold text-gray-700">Admins</p>
          <p className="mt-3 text-3xl font-bold text-gray-900">{adminsList.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm font-semibold text-gray-700">Formateurs</p>
          <p className="mt-3 text-3xl font-bold text-gray-900">{formateursList.length}</p>
        </div>
        <div className={`rounded-lg border-2 p-6 ${pendingCount_n.n > 0 ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white'}`}>
          <p className="text-sm font-semibold text-gray-700">Apprenants (en attente)</p>
          <p className={`mt-3 text-3xl font-bold ${pendingCount_n.n > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{pendingCount_n.n}</p>
        </div>
      </div>

      {/* Admins List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Administrateurs</h2>
          <Link href="/admin/utilisateurs?role=admin" className="text-sm font-semibold text-bo-bleu hover:underline">
            Voir tous →
          </Link>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Créé le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {adminsList.length > 0 ? (
                adminsList.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">{admin.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(admin.createdAt).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="px-6 py-8 text-center text-sm text-gray-600">
                    Aucun administrateur trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Formateurs List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Formateurs</h2>
          <Link href="/admin/utilisateurs" className="text-sm font-semibold text-bo-bleu hover:underline">
            Voir tous →
          </Link>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Créé le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {formateursList.length > 0 ? (
                formateursList.map((formateur) => (
                  <tr key={formateur.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">{formateur.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(formateur.createdAt).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="px-6 py-8 text-center text-sm text-gray-600">
                    Aucun formateur trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Apprenants List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Apprenants Récents</h2>
          <Link href="/admin/utilisateurs" className="text-sm font-semibold text-bo-bleu hover:underline">
            Voir tous →
          </Link>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nom</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Statut</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Créé le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {apprenantsList.length > 0 ? (
                apprenantsList.map((apprenant) => (
                  <tr key={apprenant.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {apprenant.firstName} {apprenant.lastName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{apprenant.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                        apprenant.validatedAt
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {apprenant.validatedAt ? 'Validé' : 'En attente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(apprenant.createdAt).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-600">
                    Aucun apprenant trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
