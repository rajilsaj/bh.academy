import Anthropic from '@anthropic-ai/sdk'
import { fr } from '@/lib/i18n/fr'

/**
 * La liste d'objectifs d'une formation, générée à partir de ce que
 * l'administrateur a écrit : nombre d'apprenants, attentes, partenaire.
 *
 * Avec `ANTHROPIC_API_KEY`, Claude rédige cinq à huit objectifs vérifiables.
 * Sans clé, ou si l'appel échoue, une liste sobre est déduite des champs :
 * l'administrateur la retouche à la main, rien ne bloque.
 */

const MODELE = 'claude-opus-5'

export type Formation = {
  name: string
  description: string | null
  expectedLearners: number | null
  expectations: string | null
  partner: string | null
  startsOn: string | null
  endsOn: string | null
}

function contexte(f: Formation): string {
  const lignes = [`Formation : ${f.name}`]
  if (f.description) lignes.push(`Description : ${f.description}`)
  if (f.expectedLearners) lignes.push(`Apprenants attendus : ${f.expectedLearners}`)
  if (f.expectations) lignes.push(`Attentes : ${f.expectations}`)
  if (f.partner) lignes.push(`Partenaire : ${f.partner}`)
  if (f.startsOn || f.endsOn) lignes.push(`Période : ${f.startsOn ?? '?'} → ${f.endsOn ?? '?'}`)
  return lignes.join('\n')
}

/** Liste de repli : lisible, vérifiable, et honnête sur ce qu'on sait. */
export function objectifsDeRepli(f: Formation): string[] {
  const o = fr.admin.formations.objectifsRepli
  const liste: string[] = []
  if (f.expectedLearners) liste.push(o.former.replace('{n}', String(f.expectedLearners)))
  liste.push(o.presence, o.modules, o.ressources, o.quiz)
  if (f.expectations) liste.push(o.attentes.replace('{attentes}', f.expectations.trim()))
  if (f.partner) liste.push(o.partenaire.replace('{partenaire}', f.partner.trim()))
  liste.push(o.certificat)
  return liste
}

export async function genererObjectifs(f: Formation): Promise<{ liste: string[]; source: 'claude' | 'repli' }> {
  if (!process.env.ANTHROPIC_API_KEY) return { liste: objectifsDeRepli(f), source: 'repli' }

  try {
    const client = new Anthropic()
    const reponse = await client.messages.create(
      {
        model: MODELE,
        max_tokens: 800,
        output_config: { effort: 'low' },
        system:
          'Tu rédiges les objectifs pédagogiques d’une formation de la Fondation BantuHub (Brazzaville). ' +
          'Réponds UNIQUEMENT par un tableau JSON de 5 à 8 chaînes en français, sans commentaire. ' +
          'Chaque objectif est une phrase courte, concrète et vérifiable, qui commence par un verbe à l’infinitif. ' +
          'N’invente aucun chiffre : reprends ceux fournis, ou reste qualitatif.',
        messages: [{ role: 'user', content: contexte(f) }],
      },
      { timeout: 20_000, maxRetries: 1 },
    )
    const texte = reponse.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
    const debut = texte.indexOf('[')
    const fin = texte.lastIndexOf(']')
    if (debut === -1 || fin === -1) throw new Error('Réponse sans tableau JSON')
    const liste = JSON.parse(texte.slice(debut, fin + 1)) as unknown
    if (!Array.isArray(liste) || liste.some((x) => typeof x !== 'string')) throw new Error('Format inattendu')
    const propre = (liste as string[]).map((s) => s.trim()).filter(Boolean).slice(0, 8)
    if (propre.length === 0) throw new Error('Liste vide')
    return { liste: propre, source: 'claude' }
  } catch (erreur) {
    console.error('[objectifs] repli :', (erreur as Error)?.message ?? erreur)
    return { liste: objectifsDeRepli(f), source: 'repli' }
  }
}
