import { readFile } from 'node:fs/promises'
import path from 'node:path'
import postgres from 'postgres'
import { optionsConnexion } from '../lib/db'
import { assurerBucket } from '../lib/storage'

type JournalEntry = { idx: number; tag: string }

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'drizzle')

/**
 * Applique les migrations SQL du dossier `drizzle`, dans l'ordre du journal.
 * Les vues sont écrites à la main (drizzle-kit ne génère pas de vues), donc on
 * exécute les fichiers directement plutôt que de passer par le migrateur.
 */
export async function runMigrations() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL manquant')

  const sql = postgres(url, optionsConnexion(url, 1))

  await sql`
    create table if not exists __migrations (
      tag text primary key,
      applied_at timestamptz not null default now()
    )
  `

  const journal = JSON.parse(
    await readFile(path.join(MIGRATIONS_DIR, 'meta', '_journal.json'), 'utf8'),
  ) as { entries: JournalEntry[] }

  const applied = new Set(
    (await sql<{ tag: string }[]>`select tag from __migrations`).map((r) => r.tag),
  )

  for (const entry of journal.entries.sort((a, b) => a.idx - b.idx)) {
    if (applied.has(entry.tag)) {
      console.log(`= ${entry.tag} (déjà appliquée)`)
      continue
    }

    const content = await readFile(path.join(MIGRATIONS_DIR, `${entry.tag}.sql`), 'utf8')
    const statements = content
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !/^(--[^\n]*\n?)*$/.test(s))

    await sql.begin(async (tx) => {
      for (const statement of statements) await tx.unsafe(statement)
      await tx`insert into __migrations (tag) values (${entry.tag})`
    })

    console.log(`+ ${entry.tag}`)
  }

  await sql.end()
  console.log('Migrations terminées.')

  // Le bucket privé des fichiers, créé une fois pour toutes sur un projet neuf.
  await assurerBucket()
}
