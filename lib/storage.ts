import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Les fichiers déposés — productions des apprenants, ressources de cours —
 * vivent dans un bucket **privé** Supabase Storage. Le serveur seul y accède,
 * avec la clé de service ; rien n'est jamais servi directement depuis
 * Supabase, tout passe par nos routes qui vérifient qui demande.
 *
 * Sans `SUPABASE_URL` (poste de développement hors ligne), les fichiers vont
 * dans `./data/uploads` : même contrat, même chemins, aucun réseau.
 */

export const BUCKET = process.env.SUPABASE_BUCKET ?? 'fichiers'
const LOCAL_ROOT = path.resolve(process.cwd(), 'data', 'uploads')

/** Évalué à l'appel, pas à l'import : les scripts chargent `.env` après avoir importé ce module. */
export function supabaseActif(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

let client: SupabaseClient | null = null
function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}

/** Refuse tout chemin qui tenterait de sortir de la racine (`..`, absolu). */
function cheminSur(relatif: string): string | null {
  const normalise = path.posix.normalize(relatif)
  if (normalise.startsWith('/') || normalise.startsWith('..') || normalise.includes('/../')) return null
  return normalise
}

/** Écrit un fichier sous `chemin` (relatif, séparateurs `/`). Renvoie le chemin stocké. */
export async function envoyerFichier(chemin: string, octets: Buffer, contentType: string): Promise<string> {
  const sur = cheminSur(chemin)
  if (!sur) throw new Error(`Chemin de fichier refusé : ${chemin}`)

  if (!supabaseActif()) {
    const absolu = path.join(LOCAL_ROOT, sur)
    await mkdir(path.dirname(absolu), { recursive: true })
    await writeFile(absolu, octets)
    return sur
  }

  const { error } = await supabase().storage.from(BUCKET).upload(sur, octets, { contentType, upsert: false })
  if (error) throw new Error(`Supabase Storage : ${error.message}`)
  return sur
}

/** Lit un fichier stocké ; `null` s'il n'existe pas ou si le chemin est refusé. */
export async function lireFichier(chemin: string): Promise<Buffer | null> {
  const sur = cheminSur(chemin)
  if (!sur) return null

  if (!supabaseActif()) {
    try {
      return await readFile(path.join(LOCAL_ROOT, sur))
    } catch {
      return null
    }
  }

  const { data, error } = await supabase().storage.from(BUCKET).download(sur)
  if (error || !data) return null
  return Buffer.from(await data.arrayBuffer())
}

/**
 * Crée le bucket privé s'il n'existe pas encore. Appelé par `npm run migrate`,
 * pour qu'un projet Supabase neuf soit prêt sans passer par le Studio.
 */
export async function assurerBucket(): Promise<void> {
  if (!supabaseActif()) return
  const { data } = await supabase().storage.getBucket(BUCKET)
  if (data) return
  const { error } = await supabase().storage.createBucket(BUCKET, { public: false })
  if (error && !/already exists/i.test(error.message)) throw new Error(`Supabase Storage : ${error.message}`)
}
