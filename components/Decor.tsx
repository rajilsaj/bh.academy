/**
 * Petits traits décoratifs de la maquette (flèches, gribouillis, étoiles).
 * Des SVG en ligne plutôt que des images : quelques centaines d'octets chacun,
 * aucune requête supplémentaire, et ils suivent la couleur du texte.
 * Tous sont purement ornementaux, donc masqués aux lecteurs d'écran.
 */
type Props = { className?: string }

/* Trait épais, bouts ronds : le feutre de la maquette. */
const commun = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 3.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
  focusable: 'false' as const,
}

export function Fleche({ className }: Props) {
  return (
    <svg viewBox="0 0 60 32" className={className} {...commun}>
      <path d="M2 22C12 4 30 2 46 14" />
      <path d="M38 6l10 8-10 8" />
    </svg>
  )
}

/** La flèche bouclée de la maquette : une boucle, puis la pointe vers le bas. */
export function FlecheBouclee({ className }: Props) {
  return (
    <svg viewBox="0 0 64 88" className={className} {...commun}>
      <path d="M14 6c-8 12-2 26 10 24s10-20-2-20-12 24 4 30 24-4 22 10-10 22-18 30" />
      <path d="M22 70l8 12 10-8" />
    </svg>
  )
}

export function Gribouillis({ className }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} {...commun}>
      <path d="M8 40c10-26 26-30 34-18s-6 24-14 18 2-22 16-18 12 20 12 20" />
    </svg>
  )
}

export function Etoile({ className }: Props) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...commun}>
      <path d="M24 4v40M4 24h40M10 10l28 28M38 10L10 38" />
    </svg>
  )
}

export function Vague({ className }: Props) {
  return (
    <svg viewBox="0 0 120 24" className={className} {...commun}>
      <path d="M2 18C18 2 30 22 46 12s28 8 44-6" />
      <path d="M102 4l14 2-6 12" />
    </svg>
  )
}

export function Croix({ className }: Props) {
  return (
    <svg viewBox="0 0 40 40" className={className} {...commun}>
      <path d="M8 8l24 24M32 8L8 32" />
    </svg>
  )
}

/** La flèche anguleuse du bas de la maquette, qui remonte vers la gauche. */
export function FlecheZigzag({ className }: Props) {
  return (
    <svg viewBox="0 0 80 60" className={className} {...commun}>
      <path d="M74 54L50 32l10-10L22 10" />
      <path d="M22 10l15-3M22 10l5 13" />
    </svg>
  )
}

/* Les grands doodles en coin des cartes de modules, comme dans la maquette. */

/** Spirale — découvrir, entrer dans le sujet. */
export function Spirale({ className }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} {...commun}>
      <path d="M32 30a2 2 0 1 1 3 3a6 6 0 1 1-9 5a11 11 0 1 1 16-8a16 16 0 1 1-24 12a21 21 0 1 1 30-16a26 26 0 1 1-38 20" />
    </svg>
  )
}

/** Bulle de dialogue — le prompt et sa réponse. */
export function Bulle({ className }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} {...commun}>
      <path d="M10 14a6 6 0 0 1 6-6h32a6 6 0 0 1 6 6v20a6 6 0 0 1-6 6H26l-10 9v-9a6 6 0 0 1-6-6z" />
      <path d="M22 24h.1M32 24h.1M42 24h.1" strokeWidth={4} />
    </svg>
  )
}

/** Fleur à quatre pétales — la fleur jaune de la maquette. */
export function Fleur({ className }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} {...commun}>
      <path d="M32 32c-8-12 0-24 0-24s8 12 0 24zM32 32c12-8 24 0 24 0s-12 8-24 0zM32 32c8 12 0 24 0 24s-8-12 0-24zM32 32c-12 8-24 0-24 0s12-8 24 0z" />
      <circle cx="32" cy="32" r="3" />
    </svg>
  )
}

/** Calendrier — la durée et les dates de la formation. */
export function Calendrier({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...commun} strokeWidth={1.8}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M7.5 14h3M13.5 14h3M7.5 17.5h3" />
    </svg>
  )
}

/* Les icônes des quatre modules — chacune dit le sujet du module. */

/** Réseau de neurones — découvrir l'IA et les IA génératives. */
export function Reseau({ className }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} {...commun}>
      <circle cx="12" cy="20" r="4" />
      <circle cx="12" cy="44" r="4" />
      <circle cx="32" cy="12" r="4" />
      <circle cx="32" cy="32" r="4" />
      <circle cx="32" cy="52" r="4" />
      <circle cx="52" cy="20" r="4" />
      <circle cx="52" cy="44" r="4" />
      <path d="M16 19l12-6M15 22l13 8M15 42l13-8M16 45l12 6M36 13l12 6M36 30l12-8M36 34l12 8M36 51l12-6" />
    </svg>
  )
}

/** Fenêtre de terminal et son invite `>_` — les fondamentaux du prompt. */
export function Prompt({ className }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} {...commun}>
      <rect x="6" y="12" width="52" height="40" rx="6" />
      <path d="M6 22h52" />
      <path d="M16 31l8 6-8 6M30 43h12" />
    </svg>
  )
}

/** Mallette et étincelle — le prompt appliqué aux cas métiers. */
export function Mallette({ className }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} {...commun}>
      <rect x="6" y="24" width="44" height="30" rx="5" />
      <path d="M20 24v-6a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v6M6 38h44" />
      <path d="M53 6c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6z" />
    </svg>
  )
}

/** Feuille de calcul et horloge — gagner du temps dans la bureautique. */
export function Tableur({ className }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} {...commun}>
      <rect x="6" y="8" width="34" height="48" rx="4" />
      <path d="M6 24h34M6 40h34M23 8v48" />
      <circle cx="51" cy="47" r="10" />
      <path d="M51 41v6l4 3" />
    </svg>
  )
}

/** Étincelle à quatre branches — le glyphe universel de l'IA. Pleine, pas tracée. */
export function Etincelle({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 1.5c1.1 6.2 4.3 9.4 10.5 10.5C16.3 13.1 13.1 16.3 12 22.5 10.9 16.3 7.7 13.1 1.5 12 7.7 10.9 10.9 7.7 12 1.5z" />
    </svg>
  )
}
