import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { envoyerFichier } from '@/lib/storage'

/**
 * Productions des apprenants (CV, lettres, rapports…). Le fichier est rangé
 * sous `<learnerId>/<docType>-v<version>-<uuid><ext>` dans le stockage (voir
 * `lib/storage.ts`) ; seul ce chemin relatif est gardé en base.
 */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

/** Extensions acceptées, alignées sur ce qu'un apprenant produit réellement. */
const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.odt',
  '.rtf',
  '.txt',
  '.xls',
  '.xlsx',
  '.ods',
  '.csv',
  '.ppt',
  '.pptx',
  '.odp',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
])

export function extensionOf(filename: string): string {
  return path.extname(filename).toLowerCase()
}

export function isAllowedFilename(filename: string): boolean {
  return ALLOWED_EXTENSIONS.has(extensionOf(filename))
}

/**
 * Le nom d'origine n'est jamais réutilisé : il vient du téléphone de l'apprenant.
 */
export async function storeUpload(params: {
  learnerId: string
  docType: string
  version: number
  originalName: string
  bytes: Buffer
}): Promise<string> {
  const ext = extensionOf(params.originalName)
  const relative = path.posix.join(
    params.learnerId,
    `${params.docType}-v${params.version}-${randomUUID()}${ext}`,
  )
  return envoyerFichier(relative, params.bytes, contentTypeFor(relative))
}

const CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.rtf': 'application/rtf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
  '.csv': 'text/csv; charset=utf-8',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.odp': 'application/vnd.oasis.opendocument.presentation',
  '.key': 'application/vnd.apple.keynote',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.zip': 'application/zip',
}

export function contentTypeFor(filename: string): string {
  return CONTENT_TYPES[extensionOf(filename)] ?? 'application/octet-stream'
}
