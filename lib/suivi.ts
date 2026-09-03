import { fr } from '@/lib/i18n/fr'

/**
 * Le questionnaire de suivi est figé dans le code : dix questions, les mêmes à
 * chaque vague, pour que les séries soient comparables d'un mois sur l'autre.
 * Pas de constructeur de formulaire — c'est un choix, pas un manque.
 */
export type SuiviQuestion =
  | { name: string; label: string; kind: 'radio'; options: { value: string; label: string }[]; required: boolean }
  | { name: string; label: string; kind: 'number'; min: number; max: number; required: boolean }
  | { name: string; label: string; kind: 'text'; required: boolean }

const q = fr.suiviQuestions

function opts(record: Record<string, string>) {
  return Object.entries(record).map(([value, label]) => ({ value, label }))
}

export const SUIVI_QUESTIONS: SuiviQuestion[] = [
  {
    name: 'situation',
    label: q.situation,
    kind: 'radio',
    options: opts(fr.inscription.statutOptions),
    required: true,
  },
  {
    name: 'usage_ia',
    label: q.usageIa,
    kind: 'radio',
    options: opts(q.usageOptions),
    required: true,
  },
  { name: 'confiance', label: q.confiance, kind: 'number', min: 1, max: 5, required: true },
  { name: 'candidatures', label: q.candidatures, kind: 'number', min: 0, max: 99, required: true },
  { name: 'entretiens', label: q.entretiens, kind: 'number', min: 0, max: 99, required: true },
  {
    name: 'revenu',
    label: q.revenu,
    kind: 'radio',
    options: opts(q.revenuOptions),
    required: true,
  },
  { name: 'outil_principal', label: q.outilPrincipal, kind: 'text', required: false },
  {
    name: 'obstacle',
    label: q.obstacle,
    kind: 'radio',
    options: opts(q.obstacleOptions),
    required: true,
  },
  { name: 'besoin', label: q.besoin, kind: 'text', required: false },
  { name: 'commentaire', label: q.commentaire, kind: 'text', required: false },
]

export function parseSuiviPayload(form: FormData): {
  payload: Record<string, unknown>
  missing: string[]
} {
  const payload: Record<string, unknown> = {}
  const missing: string[] = []

  for (const question of SUIVI_QUESTIONS) {
    const raw = form.get(question.name)
    const value = typeof raw === 'string' ? raw.trim() : ''
    if (!value) {
      if (question.required) missing.push(question.name)
      continue
    }
    if (question.kind === 'number') {
      const n = Number(value)
      if (!Number.isFinite(n) || n < question.min || n > question.max) {
        if (question.required) missing.push(question.name)
        continue
      }
      payload[question.name] = n
    } else if (question.kind === 'radio') {
      if (!question.options.some((o) => o.value === value)) {
        if (question.required) missing.push(question.name)
        continue
      }
      payload[question.name] = value
    } else {
      payload[question.name] = value.slice(0, 500)
    }
  }

  return { payload, missing }
}
