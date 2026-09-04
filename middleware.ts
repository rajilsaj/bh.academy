import { NextResponse, type NextRequest } from 'next/server'

/**
 * Deux rôles, sans script dans la page :
 *
 *  - **Audience** : un identifiant de visiteur en cookie (un an), et deux
 *    en-têtes de requête (`x-chemin`, `x-visiteur`) pour que le layout
 *    racine enregistre la page vue (`lib/visites.ts`).
 *
 *  - **Mode économie** : la synthèse « réseau lent ou données économisées »
 *    faite ici, une fois, et transmise aux composants serveur par l'en-tête
 *    `x-economie` (voir `lib/economie.ts`). Sources, par priorité : le lien
 *    `?eco=1|0` (choix explicite, gardé en cookie), le cookie posé par le
 *    script client, l'en-tête `Save-Data`, l'en-tête Client Hint `ECT`.
 *
 * Le back-office et les routes d'API ne sont pas concernés : le `matcher`
 * les exclut, ainsi que les fichiers.
 */

export const COOKIE_VISITEUR = 'bh_visiteur'
const COOKIE_ECO = 'bh_eco'
const UN_AN = 60 * 60 * 24 * 365
const UN_JOUR = 60 * 60 * 24

export function middleware(request: NextRequest) {
  const url = request.nextUrl

  // ---------------------------------------------------------- choix explicite
  // `?eco=1` ou `?eco=0` : on garde le choix un an et on renvoie sur l'URL propre.
  const choix = url.searchParams.get('eco')
  if (choix === '1' || choix === '0') {
    const propre = url.clone()
    propre.searchParams.delete('eco')
    const redirection = NextResponse.redirect(propre, 303)
    redirection.cookies.set(COOKIE_ECO, choix, { maxAge: UN_AN, path: '/', sameSite: 'lax' })
    return redirection
  }

  // ------------------------------------------------------------ mode économie
  const cookieEco = request.cookies.get(COOKIE_ECO)?.value
  const saveData = request.headers.get('save-data')?.toLowerCase() === 'on'
  const ect = request.headers.get('ect')?.toLowerCase()
  const reseauLent = ect === 'slow-2g' || ect === '2g'

  let economie = false
  let raison = ''
  if (cookieEco === '1') [economie, raison] = [true, 'choix']
  else if (cookieEco === '0') economie = false
  else if (saveData) [economie, raison] = [true, 'save-data']
  else if (cookieEco === 'auto' || reseauLent) [economie, raison] = [true, 'reseau']

  // ----------------------------------------------------------------- audience
  const existant = request.cookies.get(COOKIE_VISITEUR)?.value
  const visiteur = existant && /^[0-9a-f-]{36}$/.test(existant) ? existant : crypto.randomUUID()

  const entetes = new Headers(request.headers)
  entetes.set('x-chemin', url.pathname + url.search)
  entetes.set('x-visiteur', visiteur)
  entetes.set('x-economie', economie ? '1' : '0')
  entetes.set('x-economie-raison', raison)

  const reponse = NextResponse.next({ request: { headers: entetes } })
  if (visiteur !== existant) {
    reponse.cookies.set(COOKIE_VISITEUR, visiteur, {
      maxAge: UN_AN,
      httpOnly: true,
      sameSite: 'lax',
      secure: url.protocol === 'https:',
      path: '/',
    })
  }
  // Le cookie « auto » posé par le script client expire vite : le réseau change.
  if (cookieEco === 'auto' && !reseauLent && !saveData) {
    reponse.cookies.set(COOKIE_ECO, 'auto', { maxAge: UN_JOUR, path: '/', sameSite: 'lax' })
  }

  // On demande au navigateur de nous dire, dès la prochaine requête, la
  // qualité de son réseau. Chrome, Edge, Opera et Samsung Internet le font.
  reponse.headers.set('Accept-CH', 'ECT, Save-Data, Downlink, RTT')
  reponse.headers.append('Vary', 'ECT, Save-Data')
  return reponse
}

export const config = {
  // Tout sauf le back-office, les API, les ressources Next et les fichiers.
  matcher: ['/((?!admin|api|_next|photos|fonts|3d|favicon\\.ico|robots\\.txt|.*\\..*).*)'],
}
