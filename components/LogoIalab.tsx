/**
 * Le logo « ia.lab », redessiné en vecteurs : les lettres de l'original sont
 * des cercles et des barres, on les trace donc telles quelles — aucune
 * police, aucune image, et la couleur suit `currentColor`.
 */
export function LogoIalab({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 770 250" className={className} fill="currentColor" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      {/* i */}
      <circle cx="33" cy="30" r="30" />
      <rect x="7" y="82" width="52" height="160" rx="2" />
      {/* a */}
      <path fillRule="evenodd" d="M162 82a80 80 0 1 0 0 160a80 80 0 1 0 0-160zM162 126a36 36 0 1 1 0 72a36 36 0 1 1 0-72z" />
      <rect x="190" y="82" width="52" height="160" rx="2" />
      {/* le point */}
      <circle cx="288" cy="210" r="32" />
      {/* l */}
      <rect x="344" y="0" width="52" height="242" rx="2" />
      {/* a */}
      <path fillRule="evenodd" d="M492 82a80 80 0 1 0 0 160a80 80 0 1 0 0-160zM492 126a36 36 0 1 1 0 72a36 36 0 1 1 0-72z" />
      <rect x="520" y="82" width="52" height="160" rx="2" />
      {/* b */}
      <rect x="598" y="0" width="52" height="242" rx="2" />
      <path fillRule="evenodd" d="M676 82a80 80 0 1 0 0 160a80 80 0 1 0 0-160zM676 126a36 36 0 1 1 0 72a36 36 0 1 1 0-72z" />
    </svg>
  )
}
