import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth, can, signOut } from '@/lib/auth'
import { fr } from '@/lib/i18n/fr'
import type { Permission } from '@/lib/auth'
import { AdminSidebar, type GroupeNav } from '@/components/AdminSidebar'

export const dynamic = 'force-dynamic'

type Lien = { href: string; label: string; permission: Permission }

/**
 * Deux groupes, c'est tout : les personnes, et la matière enseignée. Un
 * formateur ne voit que le second ; l'administrateur voit les deux.
 */
const GROUPES: { titre: string; liens: Lien[] }[] = [
  {
    titre: fr.admin.sidebar.personnes,
    liens: [{ href: '/admin/utilisateurs', label: fr.admin.nav.utilisateurs, permission: 'gererUtilisateurs' }],
  },
  {
    titre: fr.admin.sidebar.audience,
    liens: [{ href: '/admin/visites', label: fr.admin.nav.visites, permission: 'voirVisites' }],
  },
  {
    titre: fr.admin.sidebar.modules,
    liens: [
      { href: '/admin/modules', label: fr.admin.nav.modules, permission: 'voirModules' },
      { href: '/admin/ressources', label: fr.admin.nav.ressources, permission: 'gererRessources' },
    ],
  },
]

async function deconnexion() {
  'use server'
  await signOut({ redirectTo: '/admin/login' })
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.role) redirect('/admin/login')
  const role = session.user.role
  const initiales = (session.user.email ?? '?').slice(0, 2).toUpperCase()

  const groupes: GroupeNav[] = GROUPES.map((g) => ({
    titre: g.titre,
    liens: g.liens.filter((l) => can(role, l.permission)).map(({ href, label }) => ({ href, label })),
  })).filter((g) => g.liens.length > 0)

  const compte = (
    <div className="flex items-center gap-3">
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-bo-panneau-2 text-xs font-semibold text-bo-doux"
        title={session.user.email ?? ''}
      >
        {initiales}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{session.user.email}</p>
        <p className="bo-doux">{fr.admin.roles[role]}</p>
      </div>
      <form action={deconnexion}>
        <button type="submit" className="bo-bouton-discret !px-3 !py-1.5 !text-xs">
          {fr.admin.seDeconnecter}
        </button>
      </form>
    </div>
  )

  return (
    <div className="bo lg:flex lg:min-h-screen">
      {/* ------------------------------------------------ barre latérale */}
      <aside className="bo-sidebar hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <Link href="/admin" className="flex items-center gap-3 border-b border-bo-bordure px-4 py-4">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-sm font-bold text-bo-fond">
            B
          </span>
          <span>
            <span className="block text-sm font-semibold leading-tight">{fr.backoffice.titre}</span>
            <span className="bo-doux block">{fr.app.baseline}</span>
          </span>
        </Link>
        <div className="flex-1 overflow-y-auto pb-4">
          <AdminSidebar groupes={groupes} />
        </div>
        <div className="border-t border-bo-bordure px-4 py-3">{compte}</div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* ------------------------------------------- en-tête petit écran */}
        <header className="border-b border-bo-bordure bg-bo-panneau lg:hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-sm font-bold text-bo-fond">
              B
            </span>
            <span className="text-base font-semibold">{fr.backoffice.titre}</span>
            <details className="ml-auto">
              <summary className="bo-bouton-discret cursor-pointer list-none">{fr.admin.sidebar.menu}</summary>
              <div className="absolute inset-x-0 z-40 mt-2 border-y border-bo-bordure bg-bo-panneau pb-3 shadow-2xl">
                <AdminSidebar groupes={groupes} />
                <div className="mt-3 border-t border-bo-bordure px-4 pt-3">{compte}</div>
              </div>
            </details>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
