'use client'

import { useState } from 'react'
import { fr } from '@/lib/i18n/fr'

/**
 * Amélioration progressive uniquement : le lien reste lisible et cliquable
 * sans JavaScript, ce bouton ne fait qu'éviter une recopie à la main.
 */
export function CopierLien({ lien }: { lien: string }) {
  const [copie, setCopie] = useState(false)

  return (
    <button
      type="button"
      className="bouton-secondaire mt-3"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(lien)
          setCopie(true)
        } catch {
          setCopie(false)
        }
      }}
    >
      {copie ? fr.app.copie : fr.app.copier}
    </button>
  )
}
