import ExcelJS from 'exceljs'

/**
 * Export Excel : un classeur, une feuille, l'en-tête figé et en gras, les
 * colonnes dimensionnées sur leur contenu. Les valeurs restent typées (nombres,
 * dates, booléens) pour qu'Excel les trie et les filtre sans conversion.
 */
export type Feuille = { nom: string; lignes: Record<string, unknown>[]; colonnes?: string[] }

function valeur(v: unknown): ExcelJS.CellValue {
  if (v === null || v === undefined) return null
  if (v instanceof Date || typeof v === 'number' || typeof v === 'boolean') return v
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export async function toXlsx(feuilles: Feuille[]): Promise<Buffer> {
  const classeur = new ExcelJS.Workbook()
  classeur.creator = 'BantuHub'
  classeur.created = new Date()

  for (const { nom, lignes, colonnes } of feuilles) {
    // Excel refuse les noms de feuille de plus de 31 caractères ou contenant []:*?/\
    const feuille = classeur.addWorksheet(nom.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31))
    const entetes = colonnes ?? (lignes.length > 0 ? Object.keys(lignes[0]) : [])
    feuille.columns = entetes.map((c) => ({ header: c, key: c }))
    for (const ligne of lignes) feuille.addRow(entetes.map((c) => valeur(ligne[c])))

    feuille.getRow(1).font = { bold: true }
    feuille.views = [{ state: 'frozen', ySplit: 1 }]
    if (entetes.length > 0) {
      feuille.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: entetes.length } }
    }
    feuille.columns.forEach((col) => {
      let largeur = 8
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const texte = cell.value instanceof Date ? 'yyyy-mm-dd hh:mm' : String(cell.value ?? '')
        largeur = Math.max(largeur, Math.min(60, texte.length + 2))
      })
      col.width = largeur
    })
  }

  return Buffer.from(await classeur.xlsx.writeBuffer())
}

export function xlsxResponse(filename: string, buffer: Buffer): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
