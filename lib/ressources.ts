import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { contentTypeFor, extensionOf } from '@/lib/uploads'
import { envoyerFichier, lireFichier } from '@/lib/storage'
import type { resources } from '@/lib/db/schema'

/**
 * Ressources de cours déposées par les formateurs : présentation (PPT, PDF),
 * vidéo, quiz Kahoot (lien), autre. Soit un lien, soit un fichier rangé sous
 * `ressources/<module>/<uuid><ext>` dans le stockage.
 */

export const MAX_RESOURCE_BYTES = 50 * 1024 * 1024

const EXTENSIONS = new Set([
  '.pdf', '.ppt', '.pptx', '.odp', '.key',
  '.doc', '.docx', '.odt', '.txt', '.md',
  '.xls', '.xlsx', '.ods', '.csv',
  '.mp4', '.webm', '.m4v', '.mp3',
  '.png', '.jpg', '.jpeg', '.webp', '.gif',
  '.zip',
])

export function extensionAcceptee(nom: string): boolean {
  return EXTENSIONS.has(extensionOf(nom))
}

export async function enregistrerFichierRessource(moduleId: string, nomOrigine: string, octets: Buffer): Promise<string> {
  const relatif = path.posix.join('ressources', moduleId, `${randomUUID()}${extensionOf(nomOrigine)}`)
  return envoyerFichier(relatif, octets, contentTypeFor(relatif))
}

export type ResourceRow = typeof resources.$inferSelect

/** Réponse HTTP pour une ressource : redirection vers le lien, ou le fichier. */
export async function reponseRessource(ressource: ResourceRow): Promise<Response> {
  if (ressource.url) return Response.redirect(ressource.url, 302)
  if (!ressource.path) return new Response('Introuvable', { status: 404 })
  const octets = await lireFichier(ressource.path)
  if (!octets) return new Response('Introuvable', { status: 404 })
  const nom = `${ressource.title.replace(/[^\w.-]+/g, '_')}${path.extname(ressource.path)}`
  return new Response(new Uint8Array(octets), {
    headers: {
      'Content-Type': contentTypeFor(ressource.path),
      'Content-Disposition': `attachment; filename="${nom}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
