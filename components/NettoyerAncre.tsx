/**
 * Retire l'ancre de l'URL après un saut de section.
 *
 * Cliquer « Le programme » mène à `/#programme` et l'ancre reste ensuite dans
 * la barre d'adresse. Sur un site d'une seule page, c'est l'adresse d'accueil
 * qu'on veut voir et partager, pas la dernière section visitée.
 *
 * C'est le seul comportement de toute la vitrine qui exige du JavaScript : le
 * navigateur n'offre aucun moyen déclaratif de suivre une ancre sans l'écrire
 * dans l'URL. Le script est donc un pur enrichissement — **sans lui, la page
 * fonctionne exactement pareil**, seule l'ancre subsiste dans l'adresse. Rien
 * n'est masqué, aucun lien ne dépend de lui, et le contenu reste entier.
 *
 * Ce n'est pas non plus un composant client React : ni `use client`, ni
 * hydratation, ni état. Une balise `<script>` de quelques lignes, posée dans le
 * HTML rendu par le serveur.
 *
 * Les pages apprenant ne l'utilisent pas : elles restent strictement sans
 * JavaScript.
 */
export function NettoyerAncre() {
  const script = `
(function () {
  function nettoyer() {
    if (!location.hash) return;
    history.replaceState(null, '', location.pathname + location.search);
  }
  // Après le saut : replaceState ne défile pas, il ne coupe donc pas
  // l'animation douce en cours.
  addEventListener('hashchange', function () {
    requestAnimationFrame(nettoyer);
  });
  // Arrivée directe sur /#section : on laisse le navigateur atteindre la
  // cible avant de nettoyer.
  if (location.hash) {
    addEventListener('load', function () {
      setTimeout(nettoyer, 600);
    });
  }
})();
`.trim()

  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
