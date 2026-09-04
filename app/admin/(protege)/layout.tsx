import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth, can, signOut } from '@/lib/auth'
import { fr } from '@/lib/i18n/fr'
import type { Permission } from '@/lib/auth'
import { AdminSidebar, type GroupeNav, type IconeNav } from '@/components/AdminSidebar'
import { policeTitre } from '@/lib/fonts'
import { MarqueIalab } from '@/components/MarqueIalab'

export const dynamic = 'force-dynamic'

type Lien = { href: string; label: string; permission: Permission; icone: IconeNav }

/**
 * Trois groupes : les personnes, la matière enseignée, la configuration. Un
 * formateur ne voit que la matière ; l'administrateur voit tout.
 */
const GROUPES: { titre: string; liens: Lien[] }[] = [
  {
    titre: '',
    liens: [{ href: '/admin', label: fr.admin.nav.tableau, permission: 'voirTableauBord', icone: 'tableau' }],
  },
  {
    titre: fr.admin.sidebar.personnes,
    liens: [{ href: '/admin/utilisateurs', label: fr.admin.nav.utilisateurs, permission: 'gererUtilisateurs', icone: 'personnes' }],
  },
  {
    titre: fr.admin.sidebar.modules,
    liens: [
      { href: '/admin/modules', label: fr.admin.nav.modules, permission: 'voirModules', icone: 'modules' },
      { href: '/admin/sessions', label: fr.admin.nav.sessions, permission: 'voirModules', icone: 'sessions' },
      { href: '/admin/ressources', label: fr.admin.nav.ressources, permission: 'gererRessources', icone: 'ressources' },
    ],
  },
  {
    titre: fr.admin.sidebar.configuration,
    liens: [
      { href: '/admin/configuration', label: fr.admin.nav.configuration, permission: 'gererConfiguration', icone: 'parametres' },
      { href: '/admin/visites', label: fr.admin.nav.visites, permission: 'voirVisites', icone: 'visites' },
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
    liens: g.liens.filter((l) => can(role, l.permission)).map(({ href, label, icone }) => ({ href, label, icone })),
  })).filter((g) => g.liens.length > 0)

  /* La marque ia.lab et sa signature, puis le nom de l'espace en petit. */
  const marque = (
    <div>
      <MarqueIalab variante="cockpit" href="/admin" hauteur="h-10" sousTitre />
      <span className="mt-3 block text-[11px] font-bold uppercase tracking-[0.25em] text-bo-doux">{fr.backoffice.titre}</span>
    </div>
  )

  const compte = (
    <div className="flex items-center gap-3 rounded-xl bg-bo-panneau-2 p-2.5">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-bo-bleu to-bo-cyan text-xs font-bold text-white"
        title={session.user.email ?? ''}
      >
        {initiales}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{session.user.email?.split('@')[0]}</p>
        <p className="bo-doux truncate">{fr.admin.roles[role]}</p>
      </div>
      <form action={deconnexion}>
        <button
          type="submit"
          title={fr.admin.seDeconnecter}
          aria-label={fr.admin.seDeconnecter}
          className="grid h-9 w-9 place-items-center rounded-lg text-bo-doux transition-colors hover:bg-white hover:text-bo-rose"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l5 4-5 4M20 12H9" />
          </svg>
        </button>
      </form>
    </div>
  )

  return (
    <div className={`${policeTitre.variable} bo lg:flex lg:min-h-screen`}>
      {/* ------------------------------------------------ barre latérale */}
      <aside className="bo-sidebar hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="px-5 pb-2 pt-6">{marque}</div>
        <div className="flex-1 overflow-y-auto pb-4 pt-2">
          <AdminSidebar groupes={groupes} />
        </div>
        <div className="space-y-2 px-3 pb-3">
          <Link href="/" className="bo-doux flex items-center justify-between px-2 hover:text-bo-bleu">
            {fr.backoffice.voirSite}
            <span aria-hidden="true">↗</span>
          </Link>
          {compte}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* ------------------------------------------- en-tête petit écran */}
        <header className="border-b border-bo-bordure bg-white lg:hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <MarqueIalab variante="cockpit" href="/admin" hauteur="h-7" />
            <details className="ml-auto">
              <summary className="bo-bouton-discret cursor-pointer list-none">{fr.admin.sidebar.menu}</summary>
              <div className="absolute inset-x-0 z-40 mt-2 border-y border-bo-bordure bg-white pb-3 shadow-2xl">
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
