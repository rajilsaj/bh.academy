import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { trainerProfiles } from '@/lib/db/schema'
import { lireFichier } from '@/lib/storage'
import { contentTypeFor } from '@/lib/uploads'

export const dynamic = 'force-dynamic'

/**
 * Le portrait d'un formateur, public : il est affiché sur la vitrine. Seul le
 * chemin enregistré en base est lu — l'URL ne désigne jamais un fichier.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/.test(params.id)) return new Response('Introuvable', { status: 404 })
  const [profil] = await db
    .select({ photoPath: trainerProfiles.photoPath })
    .from(trainerProfiles)
    .where(eq(trainerProfiles.staffId, params.id))
    .limit(1)
  if (!profil?.photoPath) return new Response('Introuvable', { status: 404 })

  const octets = await lireFichier(profil.photoPath)
  if (!octets) return new Response('Introuvable', { status: 404 })

  return new Response(new Uint8Array(octets), {
    headers: {
      'Content-Type': contentTypeFor(profil.photoPath),
      // Une heure côté navigateur ; un nouveau portrait change le chemin en base.
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
