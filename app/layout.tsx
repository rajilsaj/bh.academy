import type { Metadata, Viewport } from 'next'
import './globals.css'
import { fr } from '@/lib/i18n/fr'

export const metadata: Metadata = {
  title: fr.app.nom,
  description: fr.app.baseline,
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // suppressHydrationWarning : un script en ligne peut poser une classe sur
  // <html> avant React (écran de chargement déjà vu pendant la visite).
  return (
    <html lang="fr-FR" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
