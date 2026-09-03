import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/** Alphabet sans caractères ambigus (ni 0/O, ni 1/I/L) : le code est lu de loin. */
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

/** Code de session projeté à l'écran, 6 caractères. */
export function generateDayCode(): string {
  const bytes = randomBytes(6)
  let out = ''
  for (let i = 0; i < 6; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  return out
}

/**
 * Jeton d'accès apprenant : 24 caractères aléatoires + 8 caractères de signature
 * HMAC(TOKEN_SECRET). Un lien mal recopié est rejeté avant même de toucher la base.
 */
const TOKEN_ALPHABET = 'abcdefghijkmnopqrstuvwxyz23456789'
const RANDOM_LEN = 24
const SIG_LEN = 8

function tokenSecret(): string {
  const secret = process.env.TOKEN_SECRET
  if (!secret) throw new Error('TOKEN_SECRET manquant')
  return secret
}

function signature(random: string): string {
  const digest = createHmac('sha256', tokenSecret()).update(random).digest()
  let out = ''
  for (let i = 0; i < SIG_LEN; i++) out += TOKEN_ALPHABET[digest[i] % TOKEN_ALPHABET.length]
  return out
}

export function generateLearnerToken(): string {
  const bytes = randomBytes(RANDOM_LEN)
  let random = ''
  for (let i = 0; i < RANDOM_LEN; i++) random += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length]
  return random + signature(random)
}

export function isWellFormedToken(token: string): boolean {
  if (typeof token !== 'string' || token.length !== RANDOM_LEN + SIG_LEN) return false
  if (!/^[a-z2-9]+$/.test(token)) return false
  const expected = Buffer.from(signature(token.slice(0, RANDOM_LEN)))
  const given = Buffer.from(token.slice(RANDOM_LEN))
  return expected.length === given.length && timingSafeEqual(expected, given)
}

/** BH-IA-001, BH-IA-002, … */
export function formatLearnerId(sequence: number, prefix = 'BH-IA'): string {
  return `${prefix}-${String(sequence).padStart(3, '0')}`
}

/**
 * Code de certificat : lisible à voix haute, recopiable sans ambiguïté par un
 * employeur, et assez large pour ne pas se deviner (31^8 combinaisons).
 * Forme : BH-2026-K7M2-QX4P
 */
export function generateCertificateCode(year: number): string {
  const bytes = randomBytes(8)
  let bloc = ''
  for (let i = 0; i < 8; i++) bloc += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  return `BH-${year}-${bloc.slice(0, 4)}-${bloc.slice(4)}`
}
