import { requirePermission } from '@/lib/auth'
import { dryRunSync, parseGoogleSheetsRows, parseXlsxRows } from '@/lib/training/sync'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) return new Response('Accès refusé', { status: 403 })

  try {
    const body = await request.json()

    if (body.source === 'xlsx_upload' && body.fileBase64) {
      const buffer = Buffer.from(body.fileBase64, 'base64')
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

      const rawRows = parseXlsxRows(rows)
      const result = await dryRunSync(rawRows, 'import')

      return Response.json(result)
    } else if (body.source === 'google_sheets' && body.sheetData) {
      const rawRows = parseGoogleSheetsRows(body.sheetData)
      const result = await dryRunSync(rawRows, 'import')

      return Response.json(result)
    } else {
      return new Response('Invalid source or missing data', { status: 400 })
    }
  } catch (error) {
    console.error('Dry run sync error:', error)
    return Response.json(
      { error: 'Dry run sync failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
