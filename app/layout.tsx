import type { Metadata, Viewport } from 'next'
import './globals.css'
import { fr } from '@/lib/i18n/fr'
import { enregistrerVisite } from '@/lib/visites'

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

  // suppressHydrationWarning : un script en ligne peut poser une classe sur
  // <html> avant React (écran de chargement déjà vu pendant la visite).
  return (
    <html lang="fr-FR" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
