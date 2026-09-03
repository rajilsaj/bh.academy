import NextAuth, { type DefaultSession, type NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { and, eq, isNull } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { staff, trainerProfiles, type Role } from '@/lib/db/schema'

declare module 'next-auth' {
  interface Session {
    user: { id: string; role: Role } & DefaultSession['user']
  }
  interface User {
    role?: Role
  }
}

/** Le bouton Google n'apparaît que si les deux identifiants OAuth sont renseignés. */
export const googleActive = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)

/** Le compte du personnel qui porte cette adresse, ou `null`. */
async function compteParEmail(email: string) {
  const [member] = await db.select().from(staff).where(eq(staff.email, email.trim().toLowerCase())).limit(1)
  return member ?? null
}

const providers: NextAuthConfig['providers'] = [
  Credentials({
    credentials: { email: {}, password: {} },
    async authorize(credentials) {
      const email = String(credentials?.email ?? '')
      const password = String(credentials?.password ?? '')
      if (!email || !password) return null

      const member = await compteParEmail(email)
      if (!member) return null
      if (!(await bcrypt.compare(password, member.passwordHash))) return null

      // `emailVerified` est réclamé par le type d'Auth.js ; il n'a pas de sens
      // ici puisqu'aucun e-mail de vérification n'est envoyé.
      return { id: member.id, email: member.email, role: member.role, emailVerified: null }
    },
  }),
]

if (googleActive) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Google renvoie toujours au choix du compte : une personne avec
      // plusieurs adresses Gmail peut prendre la bonne.
      authorization: { params: { prompt: 'select_account' } },
    }),
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/admin/login', error: '/admin/login' },
  providers,
  callbacks: {
    /**
     * Google ne crée jamais de compte : seule une adresse déjà enregistrée par un
     * administrateur dans Utilisateurs peut entrer. Un formateur invité qui
     * arrive par Google confirme son compte du même coup.
     */
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') return true
      const email = String(profile?.email ?? '')
      if (!email || profile?.email_verified === false) return false
      const member = await compteParEmail(email)
      if (!member) return false
      await db
        .update(trainerProfiles)
        .set({ confirmedAt: new Date(), invitationToken: null })
        .where(and(eq(trainerProfiles.staffId, member.id), isNull(trainerProfiles.confirmedAt)))
      return true
    },
    async jwt({ token, user, account }) {
      if (account?.provider === 'google') {
        // L'identité vient de notre table, pas du profil Google.
        const member = await compteParEmail(String(user?.email ?? token.email ?? ''))
        if (member) {
          token.uid = member.id
          token.role = member.role
          token.email = member.email
        }
      } else if (user) {
        token.uid = user.id
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      session.user = {
        ...session.user,
        id: String(token.uid ?? ''),
        role: token.role as Role,
      }
      return session
    },
  },
})

/** Qui a le droit de faire quoi. Une seule source de vérité. */
export const PERMISSIONS = {
  /* Les deux rôles entrent dans le back-office. */
  voirTableauBord: ['admin', 'formateur'],
  voirApprenants: ['admin', 'formateur'],
  voirModules: ['admin', 'formateur'],
  gererRessources: ['admin', 'formateur'],
  /* L'administrateur seul gère les comptes, les formations et voit les coordonnées. */
  voirCoordonnees: ['admin'],
  gererUtilisateurs: ['admin'],
  gererFormations: ['admin'],
} as const satisfies Record<string, readonly Role[]>

export type Permission = keyof typeof PERMISSIONS

export function can(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false
  return (PERMISSIONS[permission] as readonly string[]).includes(role)
}

/** Renvoie la session si le rôle a la permission, sinon `null`. */
export async function requirePermission(permission: Permission) {
  const session = await auth()
  if (!session?.user?.role) return null
  return can(session.user.role, permission) ? session : null
}
