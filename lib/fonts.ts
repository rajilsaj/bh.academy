import localFont from 'next/font/local'

/**
 * Polices auto-hébergées (OFL 1.1) : aucune requête vers un domaine tiers.
 * Chaque famille n'est téléchargée que par les pages qui posent réellement sa
 * variable CSS — importer ce module ne coûte rien aux pages qui ne s'en servent pas.
 */

/** Titres de la vitrine et des pages apprenant. */
export const policeTitre = localFont({
  // Un seul graisse : tous les titres sont en gras. Embarquer le 600 inutilisé
  // coûterait 16 Ko à chaque page apprenant, pour rien.
  src: [{ path: '../app/fonts/fredoka-latin-700-normal.woff2', weight: '700', style: 'normal' }],
  variable: '--police-titre',
  display: 'swap',
  fallback: ['system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
})

/**
 * Mots manuscrits d'accentuation. 51 Ko : réservé à l'accueil et à
 * l'inscription, jamais chargé sur les écrans consultés en données mobiles.
 */
export const policeAccent = localFont({
  src: [{ path: '../app/fonts/caveat-latin-700-normal.woff2', weight: '700', style: 'normal' }],
  variable: '--police-accent',
  display: 'swap',
  fallback: ['Segoe Script', 'Bradley Hand', 'cursive'],
})
