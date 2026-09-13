import { redirect } from 'next/navigation'
import { auth, signIn } from '@/lib/auth'
import { policeTitre } from '@/lib/fonts'
import { MarqueIalab } from '@/components/MarqueIalab'
import { LogoFondation } from '@/components/LogoFondation'

export const dynamic = 'force-dynamic'

/** Google logo in four colors */
function MarqueGoogle() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.3 7.3 0 0 1-10.9-3.8H1.2v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.2 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.2a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.5-3.5A12 12 0 0 0 1.2 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z" />
    </svg>
  )
}

async function connexionGoogle() {
  'use server'
  await signIn('google', { redirectTo: '/mon-espace' })
}

export default async function HomePage() {
  const session = await auth()

  // If already logged in, redirect to appropriate page
  if (session?.user?.role) redirect('/admin')
  if (session?.user?.googleSub) redirect('/mon-espace')

  return (
    <div className={`${policeTitre.variable} bo grid h-screen place-items-center px-4 py-16`}>
      <main className="w-full max-w-sm">
        {/* Header with logos */}
        <div className="mb-8 flex items-end justify-between gap-3">
          <MarqueIalab variante="cockpit" href="/" hauteur="h-12" sousTitre />
          <LogoFondation variante="couleur" hauteur="h-10" />
        </div>

        {/* Login card */}
        <div className="bo-panneau space-y-6">
          <div>
            <h1 className="mb-2 text-3xl font-bold">Cockpit IALAB</h1>
            <p className="bo-doux text-sm">Connexion avec Google</p>
          </div>

          <form action={connexionGoogle}>
            <button
              type="submit"
              className="bo-bouton w-full justify-center gap-3 !py-4 !text-base font-semibold"
            >
              <MarqueGoogle />
              Continuer avec Google
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Plateforme de gestion de la formation IA de la Fondation BantuHub
        </p>
      </main>
    </div>
  )
}
