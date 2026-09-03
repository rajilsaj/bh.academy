import { fr } from '@/lib/i18n/fr'
import { LogoFondation } from '@/components/LogoFondation'
import { MarqueClaude } from '@/components/MarqueClaude'

const v = fr.vitrine

/**
 * Mention de conception, en bas des pages vitrine.
 *
 * Le nom porte un dégradé animé (voir `.signature-nom` dans globals.css) qui
 * retombe sur une couleur pleine si le navigateur ne sait pas découper un
 * dégradé sur du texte, et qui cesse de défiler si l'utilisateur a demandé
 * moins d'animations. Aucun JavaScript : c'est du texte et du CSS.
 *
 * Réservée aux pages qui chargent les polices de la charte (accueil,
 * certificat) : `.signature-nom` et `.manuscrit` en dépendent.
 */
export function Signature() {
  return (
    <section className="mt-10 pt-2">
      <div className="mt-7 text-center">
        <p className="text-[0.68rem] uppercase tracking-[0.3em] text-white/45">
          {v.signatureLabel}
        </p>

        <p className="signature-nom mt-2 text-4xl leading-tight sm:text-5xl lg:text-6xl">
          {v.signatureNom}
        </p>
        {/* « by » puis la marque elle-même, pas le mot. */}
        <p className="mt-1 flex items-center justify-center gap-2.5">
          <span className="titre text-lg text-white/70 sm:text-xl">{v.signatureNomSuite}</span>
          <LogoFondation hauteur="h-7 sm:h-8" />
        </p>

        <p className="manuscrit mt-2 text-2xl sm:text-3xl">{v.signatureManuscrit}</p>

        {/* « généré par », puis la marque Claude et son nom. */}
        <p className="texte-leger mt-5 flex items-center justify-center gap-2.5 text-white/90">
          <span>{v.signatureGenere}</span>
          <MarqueClaude className="h-7 w-7 shrink-0 text-marque-claude" />
          <span className="titre text-lg text-white sm:text-xl">{v.signatureIA}</span>
        </p>

        <CreditSource />
      </div>
    </section>
  )
}

/**
 * Crédit d'ingénierie, invisible à l'écran : il n'existe que dans la source.
 *
 * En JSX, `{/* … *\/}` est retiré à la compilation et n'atteint jamais le HTML.
 * Pour qu'un vrai commentaire arrive dans la page — celui qu'on voit avec
 * « Afficher le code source » — il faut le poser via `dangerouslySetInnerHTML`.
 * Le contenu est une constante du dépôt, jamais une saisie : aucune injection
 * possible.
 *
 * Le conteneur porte `hidden` : rien n'est peint, rien n'occupe de place, et
 * les lecteurs d'écran l'ignorent. Seul quelqu'un qui lit le code le trouve.
 */
function CreditSource() {
  const credit = [
    '',
    '  ╭───────────────────────────────────────────────╮',
    '  │                                               │',
    `  │   ${v.signatureRole.padEnd(42)}│`,
    `  │   ${v.signatureAuteur.padEnd(42)}│`,
    `  │   ${v.signatureAuteurUrl.padEnd(42)}│`,
    '  │                                               │',
    `  │   ${(v.signatureGenere + ' ' + v.signatureIA).padEnd(42)}│`,
    `  │   ${(v.signatureLabel + ' ' + v.signatureNom + ' ' + v.signatureNomSuite).padEnd(42)}│`,
    '  │                                               │',
    '  ╰───────────────────────────────────────────────╯',
    '',
    '  Vous lisez la source. Bien joué.',
    '',
  ].join('\n')

  return <div hidden dangerouslySetInnerHTML={{ __html: `<!--\n${credit}-->` }} />
}
