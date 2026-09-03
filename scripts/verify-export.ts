import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import postgres from 'postgres'
import { toCsv } from '../lib/csv'

/**
 * Vérifie le critère « les CSV se réimportent proprement » : chaque table est
 * exportée, puis relue par `COPY ... FROM STDIN (FORMAT csv)` dans une table
 * jumelle vide, et les deux sont comparées ligne à ligne.
 *
 *   npx tsx scripts/verify-export.ts
 */
const TABLES = [
  'cohorts',
  'learners',
  'staff',
  'sessions',
  'attendance',
  'quizzes',
  'quiz_questions',
  'quiz_attempts',
  'waves',
  'responses',
  'documents',
  'outcomes',
  'certificates',
]

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, {
    max: 1,
    connection: { client_encoding: 'UTF8' },
  })
  let echecs = 0

  for (const table of TABLES) {
    const infos = await sql<{ column_name: string; data_type: string }[]>`
      select column_name, data_type from information_schema.columns
      where table_schema = 'public' and table_name = ${table}
      order by ordinal_position`
    const colonnes = infos.map((c) => c.column_name)

    // Même règle que l'export réel : PostgreSQL rend les horodatages en texte,
    // sinon les microsecondes se perdent dans un Date JavaScript.
    const selection = infos
      .map((c) =>
        c.data_type.startsWith('timestamp')
          ? `"${c.column_name}"::text as "${c.column_name}"`
          : `"${c.column_name}"`,
      )
      .join(', ')

    const lignes = await sql.unsafe(`select ${selection} from "${table}"`)
    const csv = toCsv(lignes as unknown as Record<string, unknown>[], colonnes)

    const cible = `reimport_${table}`
    await sql.unsafe(`drop table if exists "${cible}"`)
    await sql.unsafe(`create table "${cible}" as select * from "${table}" with no data`)

    const liste = colonnes.map((c) => `"${c}"`).join(', ')
    const flux = await sql
      .unsafe(`copy "${cible}" (${liste}) from stdin with (format csv, header true)`)
      .writable()
    await pipeline(Readable.from([csv]), flux)

    const [{ n: attendu }] = await sql.unsafe(`select count(*)::int as n from "${table}"`)
    const [{ n: obtenu }] = await sql.unsafe(`select count(*)::int as n from "${cible}"`)
    const [{ n: differences }] = await sql.unsafe(`
      select count(*)::int as n from (
        (select * from "${table}" except select * from "${cible}")
        union all
        (select * from "${cible}" except select * from "${table}")
      ) d`)

    const ok = attendu === obtenu && differences === 0
    if (!ok) echecs++
    console.log(
      `${ok ? 'OK  ' : 'ECHEC'} ${table.padEnd(16)} ${String(attendu).padStart(4)} lignes exportées, ` +
        `${String(obtenu).padStart(4)} réimportées, ${differences} différence(s)`,
    )

    await sql.unsafe(`drop table "${cible}"`)
  }

  console.log(echecs === 0 ? '\nToutes les tables se réimportent à l’identique.' : `\n${echecs} échec(s).`)
  await sql.end()
  if (echecs > 0) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
