import { fr } from '@/lib/i18n/fr'

const v = fr.vitrine

/**
 * Deux versions du même logo, selon le fond :
 *   - `blanc`   — sur le violet. Original 300 × 90.
 *   - `couleur` — sur fond blanc et à l'impression (le certificat), où le
 *                 blanc disparaîtrait. Original 5868 × 1766.
 * Aucune largeur ne dépasse celle du fichier d'origine.
 */
const VARIANTES = {
  blanc: { slot: 'logo/bantuhub-blanc', largeurs: [150, 225, 300], ratio: 300 / 90 },
  couleur: { slot: 'logo/fondation', largeurs: [240, 360, 480], ratio: 5868 / 1766 },
} as const

/**
 * Logo de la Fondation — la marque partout où le site cite BantuHub.
 *
 * Lié par défaut au site institutionnel ; `href` permet d'en faire un retour
 * à l'accueil quand c'est ce que le contexte attend.
 *
 * PNG uniquement : sur des aplats avec une large zone transparente, la
 * palette bat WebP. Voir `scripts/photos.ts`. 4 à 12 Ko selon la taille —
 * assez léger pour les pages apprenant et leur budget de 100 Ko.
 */
export function LogoFondation({
  variante = 'blanc',
  hauteur = 'h-7 sm:h-8',
  href: hrefDemande,
  className,
}: {
  variante?: keyof typeof VARIANTES
  /** Classes de hauteur ; la largeur suit les proportions. */
  hauteur?: string
  /** Absent ou `undefined` : le site de la Fondation. */
  href?: string
  className?: string
}) {
  const href = hrefDemande ?? v.fondationUrl
  const { slot, largeurs, ratio } = VARIANTES[variante]
  const plusGrande = largeurs[largeurs.length - 1]
  const srcSet = largeurs.map((l) => `/photos/${slot}-${l}.png ${l}w`).join(', ')
  const externe = href.startsWith('http')

  return (
    <a
      href={href}
      {...(externe ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      title={v.fondationEnSavoirPlus}
      className={`eco-cacher inline-flex items-center rounded transition-opacity hover:opacity-80 ${className ?? ''}`}
    >
      <img
        src={`/photos/${slot}-${plusGrande}.png`}
        srcSet={srcSet}
        sizes="(min-width: 640px) 160px, 130px"
        alt={v.logoAlt}
        width={plusGrande}
        height={Math.round(plusGrande / ratio)}
        className={`${hauteur} w-auto`}
        loading="lazy"
        decoding="async"
      />
    </a>
  )
}
