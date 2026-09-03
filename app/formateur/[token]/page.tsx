import { eq } from 'drizzle-orm'
import { AlerteSombre } from '@/components/AccesRefuse'
import { LogoFondation } from '@/components/LogoFondation'
import { db } from '@/lib/db'
import { staff, trainerProfiles } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { confirmerCompte } from './actions'

export const dynamic = 'force-dynamic'

const t = fr.formateur

/** La page que reçoit un formateur invité : choisir un mot de passe, et c'est tout. */
export default async function ConfirmationFormateur({ params, searchParams }: { params: { token: string }; searchParams: { e?: string } }) {
  const valide = /^[a-f0-9]{48}$/.test(params.token)
  const [profil] = valide
    ? await db
        .select({ nom: trainerProfiles.fullName, email: staff.email })
        .from(trainerProfiles)
        .innerJoin(staff, eq(staff.id, trainerProfiles.staffId))
        .where(eq(trainerProfiles.invitationToken, params.token))
        .limit(1)
    : []

  const erreur = searchParams.e === 'court' ? t.court : searchParams.e === 'differents' ? t.differents : searchParams.e ? t.invalide : null

  return (
    <div className="bo grid place-items-center px-4 py-16">
      <main className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <LogoFondation hauteur="h-9" href="/" />
          <div>
            <p className="font-semibold">{fr.backoffice.titre}</p>
            <p className="bo-doux">{fr.app.baseline}</p>
          </div>
        </div>
        <div className="bo-panneau">
          <h1 className="mb-2 text-lg font-semibold">{t.titre}</h1>
          {!profil ? (
            <AlerteSombre>{t.invalide}</AlerteSombre>
          ) : (
            <>
              <p className="mb-4 text-sm text-bo-doux">
                {profil.nom} · {profil.email}
                <br />
                {t.intro}
              </p>
              {erreur ? <div className="mb-4"><AlerteSombre>{erreur}</AlerteSombre></div> : null}
              <form action={confirmerCompte} className="space-y-4">
                <input type="hidden" name="token" value={params.token} />
                <div>
                  <label className="bo-doux mb-1 block" htmlFor="password">{t.motDePasse}</label>
                  <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="bo-champ" />
                </div>
                <div>
                  <label className="bo-doux mb-1 block" htmlFor="confirm">{t.confirmer}</label>
                  <input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className="bo-champ" />
                </div>
                <button type="submit" className="bo-bouton w-full justify-center">{t.activer}</button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
