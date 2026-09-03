import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import postgres from 'postgres'
import bcrypt from 'bcryptjs'
import { drizzle } from 'drizzle-orm/postgres-js'
import { optionsConnexion } from '../lib/db'
import { runMigrations } from './migrate'
import { runSeed, semerBantuLab } from './seed'

/**
 * Charge `.env` quand on lance les scripts à la main, hors conteneur.
 * Les variables déjà définies dans l'environnement gagnent toujours.
 */
function chargerEnv() {
  const fichier = path.resolve(process.cwd(), '.env')
  if (!existsSync(fichier)) return
  for (const ligne of readFileSync(fichier, 'utf8').split('\n')) {
    const trimmed = ligne.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separateur = trimmed.indexOf('=')
    if (separateur === -1) continue
    const cle = trimmed.slice(0, separateur).trim()
    const valeur = trimmed.slice(separateur + 1).trim().replace(/^["']|["']$/g, '')
    if (!(cle in process.env)) process.env[cle] = valeur
  }
}

/**
 * Point d'entrée unique des scripts : `npm run migrate`, `npm run seed`, et
 * `bantulab`. Sur Vercel, `vercel-build` lance `migrate` avant `next build`.
 */
async function main() {
  chargerEnv()
  const commande = process.argv[2] ?? 'migrate'

  switch (commande) {
    case 'migrate':
      await runMigrations()
      break

    case 'seed':
      await runSeed()
      break

    // Ajoute la formation de démonstration (modules, formateur, ressources,
    // points) à une base existante, sans rien effacer. Ne fait rien si une
    // formation existe déjà.
    case 'bantulab': {
      const sql = postgres(process.env.DATABASE_URL!, optionsConnexion(process.env.DATABASE_URL!, 1))
      try {
        const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from programs`
        if (n > 0) {
          console.log('Une formation existe déjà : rien à faire.')
          break
        }
        const [cohorte] = await sql<{ id: string }[]>`select id from cohorts order by starts_on limit 1`
        if (!cohorte) throw new Error('Aucune promotion en base')
        const hash = await bcrypt.hash(process.env.SEED_PASSWORD ?? 'bantuhub2025', 10)
        await semerBantuLab(drizzle(sql), sql, cohorte.id, hash)
        console.log('Formation de démonstration ajoutée.')
      } finally {
        await sql.end()
      }
      break
    }

    default:
      throw new Error(`Commande inconnue : ${commande}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
