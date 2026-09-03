import { NextResponse, type NextRequest } from 'next/server'

/**
 * Mesure d'audience, côté serveur, sans script dans la page.
 *
 * Sur chaque page publique, on pose un identifiant de visiteur en cookie
 * (un an) s'il n'en a pas, et on transmet à la page le chemin demandé et cet
 * identifiant via deux en-têtes de requête. Le layout racine enregistre alors
 * la visite en base (`lib/visites.ts`). Le back-office et les routes d'API ne
 * sont pas mesurés : le `matcher` les exclut, ainsi que les fichiers.
 */

export const COOKIE_VISITEUR = 'bh_visiteur'
const UN_AN = 60 * 60 * 24 * 365

export function middleware(request: NextRequest) {
  const existant = request.cookies.get(COOKIE_VISITEUR)?.value
  const visiteur = existant && /^[0-9a-f-]{36}$/.test(existant) ? existant : crypto.randomUUID()

  const entetes = new Headers(request.headers)
  entetes.set('x-chemin', request.nextUrl.pathname + request.nextUrl.search)
  entetes.set('x-visiteur', visiteur)

  const reponse = NextResponse.next({ request: { headers: entetes } })
  if (visiteur !== existant) {
    reponse.cookies.set(COOKIE_VISITEUR, visiteur, {
      maxAge: UN_AN,
      httpOnly: true,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
      path: '/',
    })
  }
  return reponse
}

export const config = {
  // Tout sauf le back-office, les API, les ressources Next et les fichiers.
  matcher: ['/((?!admin|api|_next|photos|fonts|3d|favicon\\.ico|robots\\.txt|.*\\..*).*)'],
}
