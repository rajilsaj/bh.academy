/**
 * Souligne, dans le menu principal, la section visible à l'écran.
 *
 * Une bande étroite au tiers supérieur de la fenêtre sert de « curseur » : la
 * section qui la traverse donne `aria-current` à son lien. Les lecteurs
 * d'écran annoncent « courant », le style s'accroche sur l'attribut — aucune
 * classe à synchroniser.
 *
 * C'est un enrichissement : sans JavaScript, le menu fonctionne exactement
 * pareil, on perd seulement le soulignement. Contenu constant, jamais une
 * saisie : aucune injection possible.
 */
export function SectionCourante() {
  const script = `
(function () {
  if (!('IntersectionObserver' in window)) return;
  function demarrer() {
    var liens = document.querySelectorAll('.nav-principale a[data-section]');
    if (!liens.length) return;
    var parId = {};
    liens.forEach(function (a) { parId[a.getAttribute('data-section')] = a; });
    var obs = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting) return;
        liens.forEach(function (a) { a.removeAttribute('aria-current'); });
        var a = parId[e.target.id];
        if (a) a.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-35% 0px -60% 0px', threshold: 0 });
    Object.keys(parId).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) obs.observe(s);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
`.trim()

  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
