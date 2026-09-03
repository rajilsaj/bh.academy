/**
 * Export CSV : RFC 4180 strict, séparateur virgule, guillemets doublés.
 * Un BOM UTF-8 est ajouté pour qu'Excel en français ouvre les accents correctement.
 * Toute sortie de ce module doit se réimporter telle quelle.
 */
// Échappement explicite plutôt que le caractère littéral : U+FEFF est invisible
// dans le source et disparaîtrait sans bruit à la première réécriture du fichier.
const BOM = '\uFEFF'

function cell(value: unknown): string {
  if (value === null || value === undefined) return ''
  let text: string
  if (value instanceof Date) text = value.toISOString()
  else if (typeof value === 'object') text = JSON.stringify(value)
  else text = String(value)

  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  const header = columns ?? (rows.length > 0 ? Object.keys(rows[0]) : [])
  const lines = [header.map(cell).join(',')]
  for (const row of rows) lines.push(header.map((c) => cell(row[c])).join(','))
  return BOM + lines.join('\r\n') + '\r\n'
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
