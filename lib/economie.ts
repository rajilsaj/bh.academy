import { headers } from 'next/headers'

/**
 * Mode économie : la page se rend sans images, sans polices, sans décor
 * animé. Il s'active de trois façons, par ordre de priorité :
 *
 *   1. Le choix de la personne — lien « mode économie » (cookie `bh_eco`).
 *   2. Le réglage « économiseur de données » du téléphone (en-tête
 *      `Save-Data: on`, envoyé par Chrome, Edge, Samsung Internet, Opera).
 *   3. La qualité du réseau vue par le navigateur : en-tête `ECT` (Client
 *      Hint, `slow-2g` ou `2g`) une fois que le serveur l'a demandé avec
 *      `Accept-CH`, ou `navigator.connection` côté client (`lib/economie-client.ts`).
 *
 * Le middleware fait la synthèse et pose l'en-tête interne `x-economie` ;
 * les composants serveur lisent ce seul indicateur. Tout marche sans
 * JavaScript : Save-Data, ECT et le cookie sont des en-têtes HTTP.
 */

export const COOKIE_ECO = 'bh_eco'

/** Le mode économie est-il actif pour la requête en cours ? (composants serveur) */
export function modeEconomie(): boolean {
  return headers().get('x-economie') === '1'
}

/** La raison affichée à la personne, pour qu'elle comprenne pourquoi la page est nue. */
export function raisonEconomie(): 'choix' | 'save-data' | 'reseau' | null {
  const r = headers().get('x-economie-raison')
  return r === 'choix' || r === 'save-data' || r === 'reseau' ? r : null
}
