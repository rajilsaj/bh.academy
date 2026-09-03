import { PHOTOS } from '@/lib/photos'

/**
 * Photo de la vitrine.
 *
 * `<picture>` avec trois sources : AVIF, WebP, puis JPEG en repli. Le
 * navigateur prend le premier format qu'il comprend et, dans `srcset`, la
 * largeur adaptée à l'écran — un téléphone télécharge 8 Ko là où un grand
 * écran en prend 83.
 *
 * Pas de `next/image` : l'optimisation à l'exécution exige `sharp` dans
 * l'image de production. Les variantes sont produites une fois pour toutes par
 * `scripts/photos.ts` et versionnées, donc le conteneur reste sans dépendance
 * native et le rendu ne coûte rien au serveur.
 *
 * `width` et `height` sont toujours posés : la place est réservée avant même
 * que l'image arrive, donc le texte ne saute pas pendant le chargement.
 */
export function Photo({
  nom,
  alt,
  sizes,
  className,
  prioritaire = false,
}: {
  /** Clé du manifeste `lib/photos.ts`. */
  nom: keyof typeof PHOTOS
  alt: string
  /** Indice de largeur d'affichage, pour que le navigateur choisisse bien. */
  sizes: string
  className?: string
  /** Vrai pour l'image au-dessus de la ligne de flottaison : chargée sans attendre. */
  prioritaire?: boolean
}) {
  const photo = PHOTOS[nom]
  const srcSet = (ext: string) =>
    photo.largeurs.map((l) => `/photos/${photo.slot}-${l}.${ext} ${l}w`).join(', ')
  const plusGrande = photo.largeurs[photo.largeurs.length - 1]

  return (
    <picture>
      <source type="image/avif" srcSet={srcSet('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet('webp')} sizes={sizes} />
      <img
        src={`/photos/${photo.slot}-${plusGrande}.jpg`}
        srcSet={srcSet('jpg')}
        sizes={sizes}
        alt={alt}
        width={photo.largeurRef}
        height={photo.hauteurRef}
        loading={prioritaire ? 'eager' : 'lazy'}
        decoding={prioritaire ? 'sync' : 'async'}
        fetchPriority={prioritaire ? 'high' : 'auto'}
        className={className}
      />
    </picture>
  )
}
