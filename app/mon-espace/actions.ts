'use server'

import { signIn, signOut } from '@/lib/auth'

export async function connexionGoogleEspace() {
  await signIn('google', { redirectTo: '/mon-espace' })
}

export async function deconnexionEspace() {
  await signOut({ redirectTo: '/mon-espace' })
}
