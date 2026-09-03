import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://bantu:bantu@localhost:5432/bantuhub'

/**
 * Options communes à l'application et aux scripts.
 *
 * Supabase impose TLS ; une base locale n'en a pas. `prepare: false` est
 * requis par le pooler de Supabase en mode transaction (port 6543), qui ne
 * garde pas les instructions préparées d'une requête à l'autre. Sur Vercel,
 * chaque instance de fonction ouvre son propre petit pool : on reste bas.
 */
export function optionsConnexion(url: string, max = Number(process.env.DB_POOL_MAX ?? 3)) {
  const locale = /localhost|127\.0\.0\.1/.test(url)
  return {
    max,
    prepare: false,
    ssl: locale ? undefined : ('require' as const),
    idle_timeout: 20,
    connect_timeout: 15,
  }
}

// Next.js recharge les modules en développement : on réutilise le pool.
const globalForDb = globalThis as unknown as { __bantuSql?: ReturnType<typeof postgres> }

export const sql = globalForDb.__bantuSql ?? postgres(connectionString, optionsConnexion(connectionString))

if (process.env.NODE_ENV !== 'production') globalForDb.__bantuSql = sql

export const db = drizzle(sql, { schema })
export { schema }
