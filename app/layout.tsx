import type { Metadata, Viewport } from 'next'
import './globals.css'
import { fr } from '@/lib/i18n/fr'
import { enregistrerVisite } from '@/lib/visites'
import { modeEconomie } from '@/lib/economie'
import { SCRIPT_ECO } from '@/lib/economie-client'

// Chaque page compte sa visite depuis les en-têtes de la requête : rien n'est prérendu.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: fr.app.nom,
  description: fr.app.baseline,
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // La page vue est comptée ici, pour tout le site public, sans script. Une
  // base injoignable ne doit jamais empêcher la page de s'afficher.
  try {
    await enregistrerVisite()
  } catch (erreur) {
    console.error('[visites]', erreur)
  }

  // Décidé par le middleware (cookie, Save-Data, ECT). `undefined` = pas encore
  // su : le script de tête tranche avec `navigator.connection`, avant tout rendu.
  const eco = modeEconomie()

  // suppressHydrationWarning : un script en ligne peut poser une classe sur
  // <html> avant React (écran de chargement déjà vu pendant la visite).
  return (
    <html lang="fr-FR" suppressHydrationWarning data-eco={eco ? '1' : undefined}>
      <head>
        {/* Détection réseau côté navigateur, 300 octets, avant la première image. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_ECO }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
