'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export type GroupeNav = { titre: string; liens: { href: string; label: string }[] }

/**
 * La navigation du back-office, en barre latérale. Le lien courant est celui
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
    <nav aria-label="Navigation du back-office">
      {groupes.map((groupe) => (
        <div key={groupe.titre}>
          <p className="bo-nav-groupe">{groupe.titre}</p>
          <ul className="space-y-0.5 px-2">
            {groupe.liens.map((lien) => (
              <li key={lien.href}>
                <Link
                  href={lien.href}
                  className="bo-nav-lien"
                  aria-current={lien.href === courant ? 'page' : undefined}
                  onClick={onClick}
                >
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
