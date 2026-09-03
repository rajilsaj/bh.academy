'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export type IconeNav = 'tableau' | 'personnes' | 'modules' | 'sessions' | 'ressources' | 'parametres' | 'visites'
export type GroupeNav = { titre: string; liens: { href: string; label: string; icone?: IconeNav }[] }

/** Traits simples, 24 × 24, une seule épaisseur : lisibles à 16 px sur le violet. */
const TRAITS: Record<IconeNav, string> = {
  tableau: 'M4 5h7v6H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 13h7v6H4z',
  personnes: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 19v-1a4 4 0 0 0-3-3.9M15 4.1a3.5 3.5 0 0 1 0 6.8',
  modules: 'M4 6h16M4 12h16M4 18h10',
  sessions: 'M5 5h14v15H5zM5 9h14M9 3v4M15 3v4',
  ressources: 'M5 4h9l5 5v11H5zM14 4v5h5',
  parametres: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
  visites: 'M4 19V9M10 19V5M16 19v-8M22 19H2',
}

function Icone({ nom }: { nom: IconeNav }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={TRAITS[nom]} />
    </svg>
  )
}

/**
 * La navigation du Cockpit, en barre latérale. Le lien courant est celui
 * dont le chemin est le plus long préfixe de l'URL : « /admin » n'est actif
 * que sur l'accueil, « /admin/modules » aussi sur une fiche formation.
 */
export function AdminSidebar({ groupes, onClick }: { groupes: GroupeNav[]; onClick?: () => void }) {
  const chemin = usePathname() ?? ''
  const tous = groupes.flatMap((g) => g.liens.map((l) => l.href))
  const courant = tous
    .filter((href) => chemin === href || chemin.startsWith(href + '/'))
    .sort((a, b) => b.length - a.length)[0]

  return (
    <nav aria-label="Navigation du Cockpit">
      {groupes.map((groupe) => (
        <div key={groupe.titre}>
          {groupe.titre ? <p className="bo-nav-groupe">{groupe.titre}</p> : <div className="pt-3" />}
          <ul className="space-y-0.5 px-2">
            {groupe.liens.map((lien) => (
              <li key={lien.href}>
                <Link
                  href={lien.href}
                  className="bo-nav-lien gap-2.5"
                  aria-current={lien.href === courant ? 'page' : undefined}
                  onClick={onClick}
                >
                  {lien.icone ? <Icone nom={lien.icone} /> : null}
                  {lien.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
