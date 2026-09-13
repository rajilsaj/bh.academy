import { google } from 'googleapis'
import { db } from './db'
import { learners, cohorts } from './db/schema'
import { eq, sql as raw } from 'drizzle-orm'
import { generateLearnerToken } from './ids'

interface FormResponse {
  timestamp: string
  status: string // Étudiant, Sans emploi, Entrepreneur
  fullName: string
  gender: string // Féminin, Masculin
  dateOfBirth: string
  idDocumentUrl: string
  phone: string // WhatsApp
  email: string
  cvUrl: string
  city: string
}

/**
 * Parse Google Sheets row into FormResponse
 * Columns: A=Timestamp, B=Status, C=Name, D=Gender, E=DOB, F=ID, G=Phone, H=Email, I=CV, J=City
 */
function parseRow(row: (string | null)[]): FormResponse | null {
  if (row.length < 10) return null
  if (!row[2] || !row[7]) return null // Name and email required

  return {
    timestamp: row[0] || '',
    status: row[1] || '',
    fullName: (row[2] || '').trim(),
    gender: row[3] || '',
    dateOfBirth: row[4] || '',
    idDocumentUrl: row[5] || '',
    phone: (row[6] || '').trim(),
    email: (row[7] || '').trim().toLowerCase(),
    cvUrl: row[8] || '',
    city: row[9] || '',
  }
}

export async function syncLearnersFromGoogleSheets(overrideSpreadsheetId?: string, overrideSheetName?: string) {
  console.log('[sheets-sync] Starting sync...')
  if (!process.env.GOOGLE_SHEETS_CREDENTIALS) {
    throw new Error('GOOGLE_SHEETS_CREDENTIALS not set')
  }

  const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS)
  console.log('[sheets-sync] Credentials loaded, email:', credentials.client_email)

  // Get config from database
  let spreadsheetId = overrideSpreadsheetId
  let sheetName = overrideSheetName

  if (!spreadsheetId || !sheetName) {
    try {
      const [configSpreadsheet] = await db.execute<{ value: string }>(raw`select value from settings where key = 'google_sheets_spreadsheet_id'`)
      const [configSheet] = await db.execute<{ value: string }>(raw`select value from settings where key = 'google_sheets_sheet_name'`)

      spreadsheetId = spreadsheetId || configSpreadsheet?.value || '1bDNHIaswXofSMkQfF4ZwBAbVJ-KCLMC-x1RkpNznZeg'
      sheetName = sheetName || configSheet?.value || 'Form_Responses'
    } catch {
      // Settings table doesn't exist or query failed, use defaults
      spreadsheetId = spreadsheetId || '1bDNHIaswXofSMkQfF4ZwBAbVJ-KCLMC-x1RkpNznZeg'
      sheetName = sheetName || 'Form_Responses'
    }
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })

  const sheets = google.sheets({ version: 'v4', auth })

  // Get the default cohort
  const [defaultCohort] = await db
    .select()
    .from(cohorts)
    .orderBy(cohorts.startsOn)
    .limit(1)

  if (!defaultCohort) {
    throw new Error('No cohort found. Create a cohort first.')
  }

  // Fetch sheet data
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `A2:J`,
  })

  const rows = response.data.values || []
  console.log(`[sheets-sync] Fetched ${rows.length} rows from sheet`)
  if (rows.length === 0) {
    console.log('[sheets-sync] No data found in sheet. Check:')
    console.log('  1. Service account has viewer access to the sheet')
    console.log('  2. Sheet contains data in rows 2 and beyond')
    console.log('  3. Columns A-J are populated')
  }
  const results = {
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as string[],
  }

  for (const row of rows) {
    try {
      const form = parseRow(row as (string | null)[])
      if (!form) {
        console.log(`[sheets-sync] Row skipped (invalid format or missing required fields)`, row)
        results.skipped++
        continue
      }

      results.total++
      console.log(`[sheets-sync] Processing: ${form.fullName} (${form.email})`)

      // Check if learner already exists
      const existing = await db
        .select()
        .from(learners)
        .where(eq(learners.email, form.email))
        .limit(1)

      if (existing.length > 0) {
        results.skipped++
        continue
      }

      // Create new learner
      const learnerId = `BH-IA-${String(results.created + 1).padStart(3, '0')}`
      const token = generateLearnerToken()

      await db.insert(learners).values({
        id: learnerId,
        cohortId: defaultCohort.id,
        fullName: form.fullName,
        phone: form.phone || null,
        email: form.email,
        token,
        validatedAt: null, // Require manual validation
        status: form.status || null,
        gender: form.gender || null,
        dateOfBirth: form.dateOfBirth || null,
        idDocumentUrl: form.idDocumentUrl || null,
        cvUrl: form.cvUrl || null,
        city: form.city || null,
        formSubmittedAt: form.timestamp ? new Date(form.timestamp) : null,
      })

      results.created++
    } catch (error) {
      results.errors.push(
        `Row ${results.total}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return results
}
