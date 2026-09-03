import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { AlerteSombre, SuccesSombre } from '@/components/AccesRefuse'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { trainerProfiles } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { changerMotDePasse, enregistrerProfil } from './actions'

export const dynamic = 'force-dynamic'

const t = fr.admin.profil
const u = fr.admin.utilisateurs

/** « Compléter son profil » : nom, bio, LinkedIn, site, Linktree, réseaux. */
export default async function ProfilPage({ searchParams }: { searchParams: { ok?: string; e?: string } }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/admin/login')
  const [profil] = await db.select().from(trainerProfiles).where(eq(trainerProfiles.staffId, session.user.id)).limit(1)

  const messageOk = searchParams.ok ? t.messages[searchParams.ok as keyof typeof t.messages] : null
  const messageErreur = searchParams.e === 'manquant' ? u.messages.manquant : searchParams.e ? t.messages[searchParams.e as keyof typeof t.messages] : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">{t.titre}</h1>
        <p className="mt-1 text-sm text-bo-doux">
          {t.sousTitre} — {session.user.email} · {fr.admin.roles[session.user.role]}
        </p>
      </div>
      {messageOk ? <SuccesSombre>{messageOk}</SuccesSombre> : null}
      {messageErreur ? <AlerteSombre>{messageErreur}</AlerteSombre> : null}

      <form action={enregistrerProfil} className="bo-panneau grid gap-3 sm:grid-cols-2">
        <div>
          <label className="bo-doux mb-1 block" htmlFor="fullName">{u.nom}</label>
          <input id="fullName" name="fullName" required maxLength={120} defaultValue={profil?.fullName ?? ''} autoComplete="name" className="bo-champ" />
        </div>
        <div>
          <label className="bo-doux mb-1 block" htmlFor="phone">{u.telephone}</label>
          <input id="phone" name="phone" type="tel" maxLength={30} defaultValue={profil?.phone ?? ''} autoComplete="tel" className="bo-champ" />
        </div>
        <div className="sm:col-span-2">
          <label className="bo-doux mb-1 block" htmlFor="bio">{t.bio}</label>
          <textarea id="bio" name="bio" rows={3} maxLength={1000} defaultValue={profil?.bio ?? ''} className="bo-champ" />
        </div>
        <div>
          <label className="bo-doux mb-1 block" htmlFor="linkedin">{u.linkedin}</label>
          <input id="linkedin" name="linkedin" type="url" defaultValue={profil?.linkedin ?? ''} placeholder="https://linkedin.com/in/…" className="bo-champ" />
        </div>
        <div>
          <label className="bo-doux mb-1 block" htmlFor="website">{u.siteWeb}</label>
          <input id="website" name="website" type="url" defaultValue={profil?.website ?? ''} placeholder="https://" className="bo-champ" />
        </div>
        <div>
          <label className="bo-doux mb-1 block" htmlFor="linktree">{u.linktree}</label>
          <input id="linktree" name="linktree" type="url" defaultValue={profil?.linktree ?? ''} placeholder="https://linktr.ee/…" className="bo-champ" />
        </div>
        <div>
          <label className="bo-doux mb-1 block" htmlFor="socials">{u.reseaux}</label>
          <input id="socials" name="socials" maxLength={300} defaultValue={profil?.socials ?? ''} className="bo-champ" />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="bo-bouton">{t.enregistrer}</button>
        </div>
      </form>

      <form action={changerMotDePasse} className="bo-panneau grid gap-3 sm:grid-cols-3">
        <h2 className="font-semibold sm:col-span-3">{t.motDePasse}</h2>
        <div>
          <label className="bo-doux mb-1 block" htmlFor="password">{t.nouveau}</label>
          <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="bo-champ" />
        </div>
        <div>
          <label className="bo-doux mb-1 block" htmlFor="confirm">{t.confirmer}</label>
          <input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className="bo-champ" />
        </div>
        <div className="flex items-end">
          <button type="submit" className="bo-bouton-discret">{fr.app.valider}</button>
        </div>
      </form>
    </div>
  )
}
