/**
 * Détection côté navigateur, pour les composants clients lourds (canvas,
 * 3D) et pour poser le cookie quand seul le navigateur connaît le réseau.
 *
 * `navigator.connection` n'existe que sur Chromium et Samsung Internet ;
 * ailleurs on s'en remet au mode déjà décidé par le serveur (`data-eco`
 * sur `<html>`) et à `prefers-reduced-data`.
 */

type Connexion = {
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g'
  saveData?: boolean
  downlink?: number
  rtt?: number
  addEventListener?: (type: 'change', cb: () => void) => void
}

function connexion(): Connexion | undefined {
  if (typeof navigator === 'undefined') return undefined
  const n = navigator as Navigator & { connection?: Connexion; mozConnection?: Connexion; webkitConnection?: Connexion }
  return n.connection ?? n.mozConnection ?? n.webkitConnection
}

/** Vrai si le réseau est lent ou si la personne demande à économiser les données. */
export function connexionLente(): boolean {
  if (typeof document !== 'undefined' && document.documentElement.dataset.eco === '1') return true
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-data: reduce)').matches) return true
  const c = connexion()
  if (!c) return false
  if (c.saveData) return true
  if (c.effectiveType === 'slow-2g' || c.effectiveType === '2g') return true
  // Un « 3g » très dégradé compte aussi : moins de 400 kb/s ou plus de 1,5 s d'aller-retour.
  if (typeof c.downlink === 'number' && c.downlink > 0 && c.downlink < 0.4) return true
  if (typeof c.rtt === 'number' && c.rtt > 1500) return true
  return false
}

/** Le script posé dans `<head>`, avant tout rendu : marque `<html data-eco>` et pose le cookie. */
export const SCRIPT_ECO = `(function(){try{
var d=document.documentElement;if(d.dataset.eco==='1'||d.dataset.eco==='0')return;
var c=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
var lent=!!(c&&(c.saveData||c.effectiveType==='slow-2g'||c.effectiveType==='2g'))||(matchMedia&&matchMedia('(prefers-reduced-data: reduce)').matches);
if(lent){d.dataset.eco='1';document.cookie='bh_eco=auto; Max-Age=86400; Path=/; SameSite=Lax';}
}catch(e){}})();`
