/**
 * Garde-fou typographique — la règle dure du système « Light & Smooth Bold » :
 * jamais de graisse ≤ 300 sous 18 px. À cette taille les déliés d'une police
 * légère disparaissent à l'écran, surtout sur un Android d'entrée de gamme.
 *
 * Le script refuse tout élément qui combine, dans un même `className` :
 *   - une graisse légère : `font-light`, `font-extralight`, `font-thin`,
 *     ou nos classes `texte-leger` / `titre-leger` ;
 *   - une taille < 18 px : `text-xs`, `text-sm`, `text-base`, avec ou sans
 *     préfixe de point de rupture (`lg:text-sm` compte aussi).
 *
 * Il tourne avec `npm run typecheck` et au début du build Docker : une
 * violation arrête la construction, elle n'arrive jamais en production.
 *
 *   npx tsx scripts/verifier-typo.ts
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const RACINES = ['app', 'components']
const EXTENSIONS = new Set(['.tsx', '.ts'])

const LEGER = /\b(?:[a-z]+:)?(?:font-(?:light|extralight|thin)|texte-leger|titre-leger)\b/
const PETIT = /\b(?:[a-z]+:)?text-(?:xs|sm|base)\b/

/** Tous les attributs className d'un fichier, avec leur numéro de ligne. */
function classNames(source: string): { ligne: number; valeur: string }[] {
  const resultats: { ligne: number; valeur: string }[] = []
  // className="…"  ou  className={`…`}  (les expressions ${} sont ignorées)
  const re = /className=(?:"([^"]*)"|\{`([^`]*)`\})/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source))) {
    const valeur = (m[1] ?? m[2] ?? '').replace(/\$\{[^}]*\}/g, ' ')
    const ligne = source.slice(0, m.index).split('\n').length
    resultats.push({ ligne, valeur })
  }
  return resultats
}

function* fichiers(dossier: string): Generator<string> {
  for (const entree of readdirSync(dossier)) {
    const chemin = path.join(dossier, entree)
    if (statSync(chemin).isDirectory()) yield* fichiers(chemin)
    else if (EXTENSIONS.has(path.extname(chemin))) yield chemin
  }
}

const violations: string[] = []
for (const racine of RACINES) {
  for (const fichier of fichiers(path.resolve(process.cwd(), racine))) {
    const source = readFileSync(fichier, 'utf8')
    for (const { ligne, valeur } of classNames(source)) {
      if (LEGER.test(valeur) && PETIT.test(valeur)) {
        violations.push(`${path.relative(process.cwd(), fichier)}:${ligne}  ${valeur.trim()}`)
      }
    }
  }
}

if (violations.length) {
  console.error('Typographie : graisse légère sous 18 px. Montez la taille (text-lg minimum) ou la graisse.\n')
  for (const v of violations) console.error('  ' + v)
  process.exit(1)
}
console.log('Typographie : aucune graisse légère sous 18 px.')
