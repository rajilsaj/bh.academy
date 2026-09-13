import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth, can, signOut } from '@/lib/auth'
import { fr } from '@/lib/i18n/fr'
import type { Permission } from '@/lib/auth'
import { AdminSidebar, type GroupeNav, type IconeNav } from '@/components/AdminSidebar'
import { CockpitCadre } from '@/components/CockpitCadre'
import { COOKIE_MENU, MENU_REPLIE } from '@/lib/cockpit-menu'
import { policeTitre } from '@/lib/fonts'
import { MarqueIalab } from '@/components/MarqueIalab'

export const dynamic = 'force-dynamic'

type Lien = { href: string; label: string; permission: Permission; icone?: IconeNav; sousLiens?: Omit<Lien, 'icone'>[] }

/**
 * Trois groupes : les personnes, la matière enseignée, la configuration. Un
 * formateur ne voit que la matière ; l'administrateur voit tout.
 */
const GROUPES: { titre: string; liens: Lien[] }[] = [
  {
    titre: '',
    liens: [{ href: '/admin', label: 'Tableau de bord', permission: 'voirTableauBord', icone: 'tableau' }],
  },
  {
    titre: 'Personnes',
    liens: [
      {
        href: '/admin/utilisateurs',
        label: 'Utilisateurs',
        permission: 'gererUtilisateurs',
        icone: 'personnes',
        sousLiens: [
          { href: '/admin/utilisateurs?role=admin', label: 'Admins', permission: 'gererUtilisateurs' },
          { href: '/admin/utilisateurs', label: 'Apprenants', permission: 'gererUtilisateurs' },
          { href: '/admin/formateurs', label: 'Formateurs', permission: 'gererUtilisateurs' },
        ],
      },
    ],
  },
  {
    titre: 'Gestion',
    liens: [
      { href: '/admin/modules', label: 'Modules', permission: 'voirModules', icone: 'modules' },
      { href: '/admin/sessions', label: 'Sessions', permission: 'voirModules', icone: 'sessions' },
      { href: '/admin/ressources', label: 'Ressources', permission: 'gererRessources', icone: 'ressources' },
    ],
  },
  {
    titre: 'Configuration',
    liens: [
      { href: '/admin/configuration', label: 'Configs', permission: 'gererConfiguration', icone: 'parametres' },
      { href: '/admin/visites', label: 'Support Technique', permission: 'voirVisites', icone: 'visites' },
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
    liens: g.liens.filter((l) => can(role, l.permission)).map(({ href, label, icone, sousLiens }) => ({
      href,
      label,
      icone,
      sousLiens: sousLiens?.filter((sl) => can(role, sl.permission)),
    })),
  })).filter((g) => g.liens.length > 0)

  /* La marque ia.lab et sa signature, puis le nom de l'espace en petit. */
  const marque = (
    <div>
      <MarqueIalab variante="cockpit" href="/admin" hauteur="h-10" sousTitre />
      <span className="mt-3 block text-[11px] font-bold uppercase tracking-[0.25em] text-bo-doux">{fr.backoffice.titre}</span>
    </div>
  )

  const avatar = (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-bo-bleu to-bo-cyan text-xs font-bold text-white"
      title={`${session.user.email ?? ''} · ${fr.admin.roles[role]}`}
    >
      {initiales}
    </span>
  )

  const boutonDeconnexion = (
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
  )

  const compte = (
    <div className="flex items-center gap-3 rounded-xl bg-bo-panneau-2 p-2.5">
      {avatar}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{session.user.email?.split('@')[0]}</p>
        <p className="bo-doux truncate">{fr.admin.roles[role]}</p>
      </div>
      {boutonDeconnexion}
    </div>
  )

  /* Menu replié : l'avatar et la sortie, l'un sous l'autre. */
  const compteReplie = (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-bo-panneau-2 py-2">
      {avatar}
      {boutonDeconnexion}
    </div>
  )

  const voirSite = (
    <Link href="/" className="bo-doux flex items-center justify-between px-2 hover:text-bo-bleu">
      {fr.backoffice.voirSite}
      <span aria-hidden="true">↗</span>
    </Link>
  )

  const voirSiteReplie = (
    <Link
      href="/"
      title={fr.backoffice.voirSite}
      aria-label={fr.backoffice.voirSite}
      className="bo-doux grid h-9 w-full place-items-center rounded-lg hover:bg-bo-panneau-2 hover:text-bo-bleu"
    >
      <span aria-hidden="true">↗</span>
    </Link>
  )

  /* ------------------------------------------- en-tête petit écran */
  const enTete = (
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
  )

  const menuReplie = cookies().get(COOKIE_MENU)?.value === MENU_REPLIE

  return (
    <CockpitCadre
      classe={policeTitre.variable}
      enTete={enTete}
      groupes={groupes}
      marque={marque}
      compte={compte}
      compteReplie={compteReplie}
      voirSite={voirSite}
      voirSiteReplie={voirSiteReplie}
      replieInitial={menuReplie}
      libelles={{ reduire: fr.admin.sidebar.reduire, agrandir: fr.admin.sidebar.agrandir }}
    >
      {children}
    </CockpitCadre>
  )
}
