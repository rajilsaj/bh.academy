import { PHOTOS } from '@/lib/photos'
import { modeEconomie } from '@/lib/economie'
import { fr } from '@/lib/i18n/fr'

/**
 * Photo de la vitrine.
 *
 * `<picture>` avec trois sources : AVIF, WebP, puis JPEG en repli. Le
 * navigateur prend le premier format qu'il comprend et, dans `srcset`, la
 * largeur adaptée à l'écran — un téléphone télécharge 8 Ko là où un grand
 * écran en prend 83.
 *
 * **Mode économie** (`lib/economie.ts`) : aucune image n'est envoyée. À la
 * place, un cadre de la même taille porte le texte alternatif — la mise en
 * page ne bouge pas, et 0 octet part sur le réseau. Si seul le navigateur
 * a détecté le réseau lent (`<html data-eco>` posé par le script de tête),
 * le CSS fait la même chose : les images paresseuses masquées ne sont
 * jamais demandées, et le substitut s'affiche.
 *
 * Pas de `next/image` : les variantes sont produites une fois pour toutes
 * par `scripts/photos.ts` et versionnées ; le rendu ne coûte rien au serveur.
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

  const substitut = (
    <span
      className={`substitut-photo ${className ?? ''}`}
      style={{ aspectRatio: `${photo.largeurRef} / ${photo.hauteurRef}` }}
      role="img"
      aria-label={alt}
    >
      <span className="substitut-photo-texte">{alt}</span>
      <span className="substitut-photo-note">{fr.economie.photoNonChargee}</span>
    </span>
  )

  // Décidé côté serveur : l'image n'est même pas dans le HTML.
  if (modeEconomie()) return substitut

  return (
    <>
      <picture className="photo-reelle">
        <source type="image/avif" srcSet={srcSet('avif')} sizes={sizes} />
        <source type="image/webp" srcSet={srcSet('webp')} sizes={sizes} />
        <img
          src={`/photos/${photo.slot}-${plusGrande}.jpg`}
          srcSet={srcSet('jpg')}
          sizes={sizes}
          alt={alt}
          width={photo.largeurRef}
          height={photo.hauteurRef}
          // En mode économie détecté par le navigateur seul, tout devient paresseux :
          // une image paresseuse masquée par le CSS n'est jamais téléchargée.
          loading={prioritaire ? 'eager' : 'lazy'}
          decoding={prioritaire ? 'sync' : 'async'}
          fetchPriority={prioritaire ? 'high' : 'auto'}
          className={className}
        />
      </picture>
      {/* Le même substitut, caché tant que <html data-eco> n'est pas posé. */}
      {substitut}
    </>
  )
}
