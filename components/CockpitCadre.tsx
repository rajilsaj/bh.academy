'use client'

import { useState, type ReactNode } from 'react'
import { AdminSidebar, type GroupeNav } from '@/components/AdminSidebar'
import { COOKIE_MENU, MENU_OUVERT, MENU_REPLIE } from '@/lib/cockpit-menu'

/**
 * Le cadre du Cockpit sur grand écran : la barre latérale repliable et, à
 * côté, le contenu. Trois traits en haut du menu le réduisent à une colonne
 * d'icônes et le rouvrent ; replié, le contenu prend toute la largeur. Le
 * choix est gardé dans un cookie, donc la page suivante s'ouvre déjà dans le
 * bon état, sans saut.
 */
export function CockpitCadre({
  classe,
  enTete,
  children,
  groupes,
  marque,
  compte,
  compteReplie,
  voirSite,
  voirSiteReplie,
  replieInitial,
  libelles,
}: {
  /** Classes du conteneur : la police de titre. */
  classe: string
  /** L'en-tête des petits écrans, avec son menu déroulant. */
  enTete: ReactNode
  /** La page. */
  children: ReactNode
  groupes: GroupeNav[]
  marque: ReactNode
  compte: ReactNode
  compteReplie: ReactNode
  voirSite: ReactNode
  voirSiteReplie: ReactNode
  replieInitial: boolean
  libelles: { reduire: string; agrandir: string }
}) {
  const [replie, setReplie] = useState(replieInitial)

  function basculer() {
    const suivant = !replie
    setReplie(suivant)
    document.cookie = `${COOKIE_MENU}=${suivant ? MENU_REPLIE : MENU_OUVERT}; path=/admin; max-age=31536000; samesite=lax`
  }

  const bouton = (
    <button
      type="button"
      onClick={basculer}
      title={replie ? libelles.agrandir : libelles.reduire}
      aria-label={replie ? libelles.agrandir : libelles.reduire}
      aria-expanded={!replie}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-bo-doux transition-colors hover:bg-bo-panneau-2 hover:text-bo-texte"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  )

  return (
    <div className={`${classe} bo lg:flex lg:min-h-screen`}>
      <aside
        data-replie={replie ? '' : undefined}
        className={`bo-sidebar hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col ${replie ? 'lg:w-[4.5rem]' : ''}`}
      >
        {replie ? (
          <div className="flex justify-center px-3 pb-2 pt-5">{bouton}</div>
        ) : (
          <div className="flex items-start justify-between gap-2 px-5 pb-2 pt-6">
            {marque}
            {bouton}
          </div>
        )}
        <div className="flex-1 overflow-y-auto pb-4 pt-2">
          <AdminSidebar groupes={groupes} replie={replie} />
        </div>
        <div className={`space-y-2 pb-3 ${replie ? 'px-2' : 'px-3'}`}>
          {replie ? voirSiteReplie : voirSite}
          {replie ? compteReplie : compte}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {enTete}
        {/* Menu replié : le contenu prend toute la largeur gagnée. */}
        <main className={`mx-auto p-4 lg:p-6 ${replie ? 'max-w-none' : 'max-w-7xl'}`}>{children}</main>
      </div>
    </div>
  )
}
