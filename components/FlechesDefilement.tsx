'use client'

import { useEffect, useState } from 'react'

/**
 * Deux flèches pour forcer le défilement des experts vers la gauche ou la
 * droite. Au premier clic, le ruban passe en mode manuel : l'animation
 * s'arrête et le cadre devient défilable, d'une carte à la fois. Sans
 * JavaScript, les flèches n'apparaissent pas — le ruban défile tout seul.
 */
export function FlechesDefilement({ cible, precedent, suivant }: { cible: string; precedent: string; suivant: string }) {
  const [pret, setPret] = useState(false)
  useEffect(() => setPret(true), [])

  function decaler(sens: -1 | 1) {
    const cadre = document.getElementById(cible)
    if (!cadre) return
    const carte = cadre.querySelector<HTMLElement>('li')
    const pas = (carte?.getBoundingClientRect().width ?? 256) + 16
    if (!cadre.classList.contains('defilement-manuel')) {
      // Premier clic : on fige le ruban au milieu de la piste doublée, pour
      // pouvoir aller dans les deux sens.
      cadre.classList.add('defilement-manuel')
      cadre.scrollLeft = cadre.scrollWidth / 4
    }
    cadre.scrollBy({ left: sens * pas, behavior: 'smooth' })
  }

  if (!pret) return null
  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => decaler(-1)} aria-label={precedent} className="fleche-defilement">
        ←
      </button>
      <button type="button" onClick={() => decaler(1)} aria-label={suivant} className="fleche-defilement">
        →
      </button>
    </div>
  )
}
