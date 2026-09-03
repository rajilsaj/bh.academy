import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthError } from 'next-auth'
import { auth, googleActive, signIn } from '@/lib/auth'
import { AlerteSombre, SuccesSombre } from '@/components/AccesRefuse'
import { fr } from '@/lib/i18n/fr'
import { LogoFondation } from '@/components/LogoFondation'
import { policeTitre } from '@/lib/fonts'

export const dynamic = 'force-dynamic'

async function connexion(formData: FormData) {
  'use server'
  try {
    await signIn('credentials', {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      redirectTo: '/admin',
    })
  } catch (error) {
    if (error instanceof AuthError) redirect('/admin/login?e=1')
    throw error
  }
}

async function connexionGoogle() {
  'use server'
  await signIn('google', { redirectTo: '/admin' })
}

/** Le trait « G » de Google, en quatre couleurs, sans image externe. */
function MarqueGoogle() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.3 7.3 0 0 1-10.9-3.8H1.2v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.2 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.2a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.5-3.5A12 12 0 0 0 1.2 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z" />
    </svg>
  )
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { e?: string; ok?: string; error?: string }
}) {
  const session = await auth()
  if (session?.user?.role) redirect('/admin')

  // `error` est posé par Auth.js quand Google a répondu mais que l'adresse
  // n'a pas de compte chez nous (AccessDenied) ou que l'échange a échoué.
  const erreur = searchParams.e
    ? fr.admin.identifiantsInvalides
    : searchParams.error === 'AccessDenied'
      ? fr.admin.googleRefuse
      : searchParams.error
        ? fr.admin.googleErreur
        : null

  return (
    <div className={`${policeTitre.variable} bo grid place-items-center px-4 py-16`}>
      <main className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          {/* La marque de la Fondation, en blanc sur le violet. */}
          <LogoFondation hauteur="h-9" href="/" />
          <div>
            <p className="titre text-2xl leading-tight">{fr.backoffice.titre}</p>
            <p className="bo-doux">{fr.backoffice.baseline}</p>
          </div>
        </div>

        <div className="bo-panneau">
          <h1 className="mb-1 text-2xl">{fr.admin.connexion}</h1>
          <p className="bo-doux mb-4">{fr.admin.connexionAide}</p>

          {erreur ? (
            <div className="mb-4">
              <AlerteSombre>{erreur}</AlerteSombre>
            </div>
          ) : null}
          {searchParams.ok === 'confirme' ? (
            <div className="mb-4">
              <SuccesSombre>{fr.admin.compteActive}</SuccesSombre>
            </div>
          ) : null}

          {googleActive ? (
            <>
              <form action={connexionGoogle}>
                <button type="submit" className="bo-bouton-discret w-full justify-center gap-2">
                  <MarqueGoogle />
                  {fr.admin.continuerGoogle}
                </button>
              </form>
              <p className="bo-doux my-4 flex items-center gap-3 before:h-px before:flex-1 before:bg-bo-bordure after:h-px after:flex-1 after:bg-bo-bordure">
                {fr.admin.ou}
              </p>
            </>
          ) : null}

          <form action={connexion} className="space-y-4">
            <div>
              <label className="bo-doux mb-1 block" htmlFor="email">
                {fr.admin.email}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="username"
                className="bo-champ"
              />
            </div>
            <div>
              <label className="bo-doux mb-1 block" htmlFor="password">
                {fr.admin.motDePasse}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="bo-champ"
              />
            </div>
            <button type="submit" className="bo-bouton w-full justify-center">
              {fr.admin.seConnecter}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center">
          <Link href="/" className="bo-doux underline">
            {fr.app.retour}
          </Link>
        </p>
      </main>
    </div>
  )
}
