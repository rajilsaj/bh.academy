import Link from 'next/link'
import { fr } from '@/lib/i18n/fr'
import { LogoIalab } from '@/components/LogoIalab'

/**
 * La marque « ia.lab » — le vrai logo, en vecteurs (`LogoIalab`) — et sous
 * lui, si on le demande, la signature « Laboratoire d'intelligence
 * artificielle appliquée ». Blanc sur la vitrine, bleu sur fond clair.
 */
export function MarqueIalab({
  variante = 'vitrine',
  href = '/',
  hauteur = 'h-8',
  sousTitre = false,
  className,
}: {
  variante?: 'vitrine' | 'cockpit'
  href?: string
  /** Classes de hauteur du logo ; la largeur suit (ratio 3,08). */
  hauteur?: string
  /** Affiche la signature complète sous le logo. */
  sousTitre?: boolean
  className?: string
}) {
  const couleurs =
    variante === 'vitrine'
      ? { logo: 'text-white', sous: 'text-white/70' }
      : { logo: 'text-vitrine-bleu', sous: 'text-bo-doux' }

  return (
    <Link href={href} aria-label={`ia.lab — ${fr.backoffice.marqueSousTitre}`} className={`inline-block ${className ?? ''}`}>
      <LogoIalab className={`${hauteur} w-auto ${couleurs.logo}`} />
      {sousTitre ? (
        <span className={`mt-1.5 block text-sm font-semibold leading-snug ${couleurs.sous}`}>{fr.backoffice.marqueSousTitre}</span>
      ) : null}
    </Link>
  )
}
