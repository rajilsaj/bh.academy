/**
 * Les marques des trois outils enseignés — ChatGPT (OpenAI), Claude
 * (Anthropic), Gemini (Google). Tracés repris tels quels de Simple Icons
 * (CC0 pour les fichiers ; les marques restent à leurs propriétaires, citées
 * ici pour nommer les outils). En ligne, en `currentColor` : nets à toute
 * taille, aucune requête, blancs sur le violet comme le texte.
 */
/*
 * ChatGPT — la marque OpenAI n'est plus distribuée par Simple Icons (404).
 * PROVISOIRE : une bulle neutre. Déposez le SVG officiel (openai.com/brand)
 * dans photos-a-integrer/chatgpt.svg et relancez la génération.
 */
export function MarqueChatGPT({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="ChatGPT">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5z" />
      <path d="M8.5 9.5h.01M12 9.5h.01M15.5 9.5h.01" strokeWidth={3} />
    </svg>
  )
}

export function MarqueGemini({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" role="img" aria-label="Gemini">
      <path d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81" />
    </svg>
  )
}

export { MarqueClaude } from '@/components/MarqueClaude'
import { MarqueClaude as _Claude } from '@/components/MarqueClaude'

/** La marque qui va avec chaque outil nommé dans la page. */
export const MARQUES_OUTILS = {
  ChatGPT: MarqueChatGPT,
  Claude: _Claude,
  Gemini: MarqueGemini,
} as const
