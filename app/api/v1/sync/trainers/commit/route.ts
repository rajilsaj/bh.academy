import { requirePermission } from '@/lib/auth'
import { commitSync, type SyncResult } from '@/lib/training/sync'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session || !session.user?.id) return new Response('Accès refusé', { status: 403 })

  try {
    const body: { dryRunResult: SyncResult; source: 'google_sheets' | 'xlsx_upload' } = await request.json()

    if (!body.dryRunResult || !body.source) {
      return new Response('Missing dryRunResult or source', { status: 400 })
    }

    const { importRunId, finalResult } = await commitSync(
      body.dryRunResult,
      session.user.id,
      body.source,
    )

    return Response.json({
      success: true,
      importRunId,
      result: finalResult,
    })
  } catch (error) {
    console.error('Commit sync error:', error)
    return Response.json(
      { error: 'Commit sync failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
