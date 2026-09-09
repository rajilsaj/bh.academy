import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib'

/**
 * Export PDF d'une liste : un tableau en A4 paysage, l'en-tête répété sur
 * chaque page, les cellules qui vont à la ligne, le pied avec la date et le
 * numéro de page. Les polices standard du PDF (Helvetica) couvrent le
 * français ; ce qu'elles ne savent pas écrire est simplement omis.
 */
export type ColonnePdf = { titre: string; largeur: number }
export type TableauPdf = {
  titre: string
  sousTitre?: string
  pied: string
  /** « Page {n} / {total} » */
  page: string
  colonnes: ColonnePdf[]
  lignes: string[][]
}

const A4_PAYSAGE: [number, number] = [841.89, 595.28]
const MARGE = 36
const TAILLE = 9
const INTERLIGNE = 12
const MARGE_CELLULE = 5

const ENCRE = rgb(0.1, 0.11, 0.16)
const DOUX = rgb(0.45, 0.47, 0.55)
const FILET = rgb(0.85, 0.86, 0.9)
const FOND_ENTETE = rgb(0.95, 0.96, 0.98)

/** Ne garde que ce que Helvetica (WinAnsi) sait encoder. */
function propre(texte: string): string {
  return texte.replace(/[^\x20-\x7E\xA0-\xFF\u2013\u2014\u2018\u2019\u201C\u201D\u2026\u2022\u20AC]/g, '').replace(/\s+/g, ' ').trim()
}

/** Coupe un texte en lignes qui tiennent dans `largeur`, mot par mot ; un mot trop long est cassé. */
function couper(texte: string, police: PDFFont, largeur: number): string[] {
  const lignes: string[] = []
  for (const paragraphe of texte.split('\n')) {
    let courante = ''
    for (const mot of paragraphe.split(' ')) {
      const essai = courante ? `${courante} ${mot}` : mot
      if (police.widthOfTextAtSize(essai, TAILLE) <= largeur) {
        courante = essai
        continue
      }
      if (courante) lignes.push(courante)
      let reste = mot
      while (police.widthOfTextAtSize(reste, TAILLE) > largeur && reste.length > 1) {
        let n = reste.length
        while (n > 1 && police.widthOfTextAtSize(reste.slice(0, n), TAILLE) > largeur) n--
        lignes.push(reste.slice(0, n))
        reste = reste.slice(n)
      }
      courante = reste
    }
    lignes.push(courante)
  }
  return lignes.length > 0 ? lignes : ['']
}

export async function tableauPdf(t: TableauPdf): Promise<Buffer> {
  const doc = await PDFDocument.create()
  doc.setTitle(t.titre)
  doc.setCreator('BantuHub')
  const police = await doc.embedFont(StandardFonts.Helvetica)
  const grasse = await doc.embedFont(StandardFonts.HelveticaBold)

  const [largeurPage, hauteurPage] = A4_PAYSAGE
  const largeurUtile = largeurPage - 2 * MARGE
  const total = t.colonnes.reduce((s, c) => s + c.largeur, 0)
  const largeurs = t.colonnes.map((c) => (c.largeur / total) * largeurUtile)
  const bas = MARGE + 24

  let page: PDFPage = doc.addPage(A4_PAYSAGE)
  let y = hauteurPage - MARGE

  const titre = () => {
    page.drawText(propre(t.titre), { x: MARGE, y: y - 16, size: 18, font: grasse, color: ENCRE })
    y -= 26
    if (t.sousTitre) {
      page.drawText(propre(t.sousTitre), { x: MARGE, y: y - 10, size: 10, font: police, color: DOUX })
      y -= 18
    }
    y -= 8
  }

  const entete = () => {
    const h = INTERLIGNE + 2 * MARGE_CELLULE
    page.drawRectangle({ x: MARGE, y: y - h, width: largeurUtile, height: h, color: FOND_ENTETE })
    let x = MARGE
    t.colonnes.forEach((c, i) => {
      page.drawText(propre(c.titre), { x: x + MARGE_CELLULE, y: y - MARGE_CELLULE - TAILLE, size: TAILLE, font: grasse, color: ENCRE })
      x += largeurs[i]
    })
    y -= h
    page.drawLine({ start: { x: MARGE, y }, end: { x: MARGE + largeurUtile, y }, thickness: 0.8, color: FILET })
  }

  const nouvellePage = () => {
    page = doc.addPage(A4_PAYSAGE)
    y = hauteurPage - MARGE
    entete()
  }

  titre()
  entete()

  for (const ligne of t.lignes) {
    const cellules = ligne.map((v, i) => couper(propre(v ?? ''), police, largeurs[i] - 2 * MARGE_CELLULE))
    const h = Math.max(...cellules.map((c) => c.length)) * INTERLIGNE + 2 * MARGE_CELLULE
    if (y - h < bas) nouvellePage()
    let x = MARGE
    cellules.forEach((lignesCellule, i) => {
      lignesCellule.forEach((texte, j) => {
        page.drawText(texte, { x: x + MARGE_CELLULE, y: y - MARGE_CELLULE - TAILLE - j * INTERLIGNE, size: TAILLE, font: police, color: ENCRE })
      })
      x += largeurs[i]
    })
    y -= h
    page.drawLine({ start: { x: MARGE, y }, end: { x: MARGE + largeurUtile, y }, thickness: 0.5, color: FILET })
  }

  const pages = doc.getPages()
  pages.forEach((p, i) => {
    const numero = propre(t.page.replace('{n}', String(i + 1)).replace('{total}', String(pages.length)))
    p.drawText(propre(t.pied), { x: MARGE, y: MARGE - 6, size: 8, font: police, color: DOUX })
    p.drawText(numero, { x: largeurPage - MARGE - police.widthOfTextAtSize(numero, 8), y: MARGE - 6, size: 8, font: police, color: DOUX })
  })

  return Buffer.from(await doc.save())
}

export function pdfResponse(filename: string, buffer: Buffer): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
