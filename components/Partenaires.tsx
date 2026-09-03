import { fr } from '@/lib/i18n/fr'
import { PHOTOS } from '@/lib/photos'

const v = fr.vitrine

/** Marque FONEA : proportions du fichier d'origine. */
const FONEA_LARGEURS = [200, 300, 400]
const FONEA_RATIO = 1600 / 950

/**
 * Le bandeau des partenaires, dans l'ordre voulu : BantuHub, la Fondation,
 * le FONEA, puis les armoiries de la République. Il ne s'affiche que sous
 * `xl`, là où le médaillon FONEA et les armoiries flottantes du héros sont
 * masqués — sur téléphone et tablette, c'est lui qui porte les partenaires.
 *
 * Chaque logo couleur est posé sur une pastille blanche : leurs teintes ne
 * tiennent pas sur le violet. Le logo BantuHub, déjà blanc, garde le violet.
 */
export function Partenaires({ className }: { className?: string }) {
  const armoiries = PHOTOS.armoiries
  const srcArmoiries = (ext: string) =>
    armoiries.largeurs.map((l) => `/photos/${armoiries.slot}-${l}.${ext} ${l}w`).join(', ')
  const srcFonea = FONEA_LARGEURS.map((l) => `/photos/logo/fonea-marque-${l}.png ${l}w`).join(', ')

  const pastille =
    'inline-flex h-12 items-center justify-center rounded-2xl bg-white px-3 transition-transform hover:scale-105 sm:h-14 sm:px-4'

  return (
    <nav aria-label={v.partenairesLabel} className={`flex flex-wrap items-center justify-center gap-3 ${className ?? ''}`}>
      {/* 1. BantuHub — logo blanc, sur une pastille translucide. */}
      <a
        href={v.fondationUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={v.fondationEnSavoirPlus}
        className={`${pastille} !bg-white/10 ring-1 ring-white/25`}
      >
        <img
          src="/photos/logo/bantuhub-blanc-300.png"
          srcSet="/photos/logo/bantuhub-blanc-150.png 150w, /photos/logo/bantuhub-blanc-225.png 225w, /photos/logo/bantuhub-blanc-300.png 300w"
          sizes="120px"
          alt={v.logoAlt}
          width={300}
          height={90}
          loading="lazy"
          decoding="async"
          className="h-7 w-auto sm:h-8"
        />
      </a>

      {/* 2. La Fondation — version couleur, sur blanc. */}
      <a href={v.fondationUrl} target="_blank" rel="noopener noreferrer" title={v.fondationEnSavoirPlus} className={pastille}>
        <img
          src="/photos/logo/fondation-480.png"
          srcSet="/photos/logo/fondation-240.png 240w, /photos/logo/fondation-360.png 360w, /photos/logo/fondation-480.png 480w"
          sizes="120px"
          alt={v.logoAlt}
          width={480}
          height={Math.round(480 / (5868 / 1766))}
          loading="lazy"
          decoding="async"
          className="h-8 w-auto sm:h-9"
        />
      </a>

      {/* 3. Le FONEA. */}
      <a href={v.foneaUrl} target="_blank" rel="noopener noreferrer" title={v.partenaireFonea} className={pastille}>
        <img
          src="/photos/logo/fonea-marque-300.png"
          srcSet={srcFonea}
          sizes="80px"
          alt={v.partenaireFonea}
          width={300}
          height={Math.round(300 / FONEA_RATIO)}
          loading="lazy"
          decoding="async"
          className="h-8 w-auto sm:h-9"
        />
      </a>

      {/* 4. Les armoiries de la République du Congo, dans un rond blanc. */}
      <span className={`${pastille} !w-12 !px-0 !rounded-full sm:!w-14`} title={v.photos.armoiries}>
        <picture>
          <source type="image/avif" srcSet={srcArmoiries('avif')} sizes="56px" />
          <source type="image/webp" srcSet={srcArmoiries('webp')} sizes="56px" />
          <img
            src={`/photos/${armoiries.slot}-160.jpg`}
            srcSet={srcArmoiries('jpg')}
            sizes="56px"
            alt={v.photos.armoiries}
            width={armoiries.largeurRef}
            height={armoiries.hauteurRef}
            loading="lazy"
            decoding="async"
            className="h-10 w-10 rounded-full object-cover sm:h-12 sm:w-12"
          />
        </picture>
      </span>
    </nav>
  )
}
