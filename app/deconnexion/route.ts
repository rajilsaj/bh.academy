import { NextResponse, type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Déconnexion par un simple lien, sans formulaire ni JavaScript : on efface
 * les cookies de session d'Auth.js (les deux noms possibles, selon HTTPS ou
 * non) et on renvoie à l'accueil — ou vers `?vers=` si c'est un chemin du site.
 */
const COOKIES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'authjs.csrf-token',
  '__Host-authjs.csrf-token',
  'authjs.callback-url',
  '__Secure-authjs.callback-url',
]

export function GET(request: NextRequest) {
  const vers = request.nextUrl.searchParams.get('vers')
  const destination = vers && vers.startsWith('/') && !vers.startsWith('//') ? vers : '/'
  const reponse = NextResponse.redirect(new URL(destination, request.nextUrl.origin), 303)
  for (const nom of COOKIES) {
    reponse.cookies.set(nom, '', { maxAge: 0, path: '/' })
  }
  reponse.headers.set('Cache-Control', 'no-store')
  return reponse
}
