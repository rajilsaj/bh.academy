/**
 * Manifeste des photos de la vitrine.
 *
 * Une seule source de vérité : `scripts/photos.ts` produit les fichiers,
 * `components/Photo.tsx` les affiche, et `components/CreditsPhotos.tsx` en tire
 * la mention de crédit. Ajouter une photo = ajouter une entrée ici.
 *
 * `photographe` est délibérément nullable. La licence Unsplash n'impose pas
 * l'attribution, mais nous la voulons : un nom absent est donc laissé à `null`
 * plutôt que deviné. Rien de faux n'est publié, et la ligne se complète dès que
 * le nom est connu.
 */
export type PhotoVitrine = {
  /** Emplacement, sans largeur ni extension : `public/photos/<slot>-<w>.<ext>`. */
  slot: string
  /** Largeurs générées, croissantes. */
  largeurs: number[]
  /** Dimensions intrinsèques du cadrage, pour réserver la place et éviter le saut de mise en page. */
  largeurRef: number
  hauteurRef: number
  /** Nom affiché du photographe, ou `null` s'il n'a pas pu être établi. */
  photographe: string | null
  /** Identifiant Unsplash, extrait du nom du fichier téléchargé. */
  unsplashId: string | null
}

export const PHOTOS: Record<string, PhotoVitrine> = {
  heros: {
    slot: 'heros/accueil',
    // Bandeau 3:1, plafonné à la largeur native de l'original (1140 px).
    largeurs: [640, 900, 1140],
    largeurRef: 1140,
    hauteurRef: 380,
    // Photo de la Fondation, prise pendant une session : ni Unsplash, ni crédit
    // tiers à porter.
    photographe: null,
    unsplashId: null,
  },
  armoiries: {
    slot: 'heros/armoiries',
    largeurs: [160, 240, 320],
    largeurRef: 320,
    hauteurRef: 320,
    // Blason officiel, rendu depuis le SVG : ni photographe, ni banque d'images.
    photographe: null,
    unsplashId: null,
  },
  /* Les visuels de la page IA Lab, fournis par la Fondation. */
  ialabPourquoi: {
    slot: 'ialab/pourquoi',
    largeurs: [400, 543],
    largeurRef: 543,
    hauteurRef: 295,
    photographe: null,
    unsplashId: null,
  },
  ialabApproche: {
    slot: 'ialab/approche',
    largeurs: [400, 543],
    largeurRef: 543,
    hauteurRef: 295,
    photographe: null,
    unsplashId: null,
  },
  ialabIntervention: {
    slot: 'ialab/intervention',
    largeurs: [400, 543],
    largeurRef: 543,
    hauteurRef: 295,
    photographe: null,
    unsplashId: null,
  },
  pratique: {
    slot: 'arguments/pratique',
    largeurs: [400, 640, 900],
    largeurRef: 900,
    hauteurRef: 675,
    // Seul nom lisible dans les fichiers déposés : Unsplash nomme ses
    // téléchargements « <photographe>-<id>-unsplash.jpg ».
    photographe: 'Christina @ wocintechchat.com',
    unsplashId: 'm-6U4n-I2_R2M',
  },
  telephone: {
    slot: 'arguments/telephone',
    largeurs: [400, 640, 900],
    largeurRef: 900,
    hauteurRef: 675,
    photographe: null,
    unsplashId: 'uAcoCc1dKiA',
  },
  suivi: {
    slot: 'arguments/suivi',
    largeurs: [400, 640, 900],
    largeurRef: 900,
    hauteurRef: 675,
    photographe: null,
    unsplashId: 'BVr3XaBiWLU',
  },
  certificat: {
    slot: 'arguments/certificat',
    largeurs: [400, 640, 900],
    largeurRef: 900,
    hauteurRef: 675,
    // Fichier renommé « 1.jpg » avant dépôt : ni photographe ni identifiant.
    photographe: null,
    unsplashId: null,
  },
  final: {
    slot: 'final/appel',
    largeurs: [640, 1024, 1600],
    largeurRef: 1600,
    hauteurRef: 900,
    photographe: null,
    unsplashId: 'YgOCJz9uGMk',
  },
}

export function pageUnsplash(photo: PhotoVitrine): string | null {
  return photo.unsplashId ? `https://unsplash.com/photos/${photo.unsplashId}` : null
}

/** Les photos créditables, dans l'ordre du manifeste. */
export function photosCreditables(): PhotoVitrine[] {
  return Object.values(PHOTOS).filter((p) => p.photographe !== null || p.unsplashId !== null)
}
