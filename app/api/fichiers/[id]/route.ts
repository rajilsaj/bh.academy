import path from 'node:path'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { documents } from '@/lib/db/schema'
import { requirePermission } from '@/lib/auth'
import { lireFichier } from '@/lib/storage'
import { contentTypeFor } from '@/lib/uploads'

export const dynamic = 'force-dynamic'

/** Téléchargement d'une production d'apprenant, réservé au personnel connecté. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await requirePermission('voirApprenants')
  if (!session) return new Response('Accès refusé', { status: 403 })

  const [doc] = await db.select().from(documents).where(eq(documents.id, params.id)).limit(1)
  if (!doc) return new Response('Introuvable', { status: 404 })

  const bytes = await lireFichier(doc.path)
  if (!bytes) return new Response('Introuvable', { status: 404 })

  const filename = `${doc.learnerId}-${doc.docType}-v${doc.version}${path.extname(doc.path)}`
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': contentTypeFor(doc.path),
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
