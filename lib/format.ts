import { fr } from '@/lib/i18n/fr'
import type { Level } from '@/lib/db/schema'

const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const dateTimeFmt = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(`${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) return '—'
  return dateFmt.format(d)
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return dateTimeFmt.format(d)
}

export function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—'
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return '—'
  return `${Math.round(n * 1000) / 10} %`.replace('.', ',')
}

export function daysSince(value: Date | string | null | undefined): number | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000))
}

/**
 * Classes Tailwind de chaque niveau, calibrées pour le fond sombre du
 * back-office — c'est le seul endroit où les badges de niveau s'affichent.
 */
export const LEVEL_CLASS: Record<Level, string> = {
  Vert: 'border-niveau-vert/40 bg-niveau-vert/15 text-niveau-vert',
  Orange: 'border-niveau-orange/40 bg-niveau-orange/15 text-niveau-orange',
  Rouge: 'border-niveau-rouge/40 bg-niveau-rouge/15 text-niveau-rouge',
  Bleu: 'border-niveau-bleu/40 bg-niveau-bleu/15 text-niveau-bleu',
}

export function levelLabel(level: Level): string {
  return fr.niveaux[level] ?? level
}

/**
 * Normalise un numéro congolais au format international sans « + » pour wa.me.
 * Les numéros mobiles au Congo-Brazzaville sont à 9 chiffres, indicatif 242.
 */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('242')) return digits.length >= 12 ? digits : null
  if (digits.length === 9) return `242${digits}`
  return digits.length >= 10 ? digits : null
}
