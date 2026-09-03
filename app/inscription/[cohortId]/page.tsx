import { eq } from 'drizzle-orm'
import { Alerte, Bloc, LearnerShell, Succes } from '@/components/LearnerShell'
import { CopierLien } from '@/components/CopierLien'
import { db } from '@/lib/db'
import { cohorts, learners } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { appUrl } from '@/lib/config'
import { inscrire } from './actions'

export const dynamic = 'force-dynamic'

const MESSAGES: Record<string, string> = {
  manquant: fr.inscription.champManquant,
  consent: fr.inscription.consentDonneesRequis,
  telephone: fr.inscription.telephoneInvalide,
  cohorte: fr.inscription.cohorteIntrouvable,
}

export default async function InscriptionPage({
  params,
  searchParams,
}: {
  params: { cohortId: string }
  searchParams: { e?: string; nouveau?: string }
}) {
  const [cohort] = await db
    .select()
    .from(cohorts)
    .where(eq(cohorts.id, params.cohortId))
    .limit(1)

  if (!cohort) {
    return (
      <LearnerShell title={fr.inscription.cohorteIntrouvable} accueilHref="/" fond="espace">
        <Bloc>
          <p className="text-slate-700">{fr.inscription.cohorteFermee}</p>
        </Bloc>
      </LearnerShell>
    )
  }

  // Confirmation : le lien personnel est le seul accès de l'apprenant.
  if (searchParams.nouveau) {
    const [learner] = await db
      .select()
      .from(learners)
      .where(eq(learners.token, searchParams.nouveau))
      .limit(1)

    if (learner) {
      const lien = `${appUrl()}/l/${learner.token}`
      return (
        <LearnerShell title={fr.inscription.succesTitre} vitrine avecAccent accueilHref="/" fond="espace">
          <Bloc className="text-center">
            <p className="manuscrit text-4xl">{fr.learner.merci}</p>
            <p className="mt-4 text-sm text-slate-600">{fr.inscription.succesIntro}</p>
            <p className="titre mt-1 text-3xl text-vitrine-violet">{learner.id}</p>
          </Bloc>

          <Bloc className="mt-3">
            <p className="etiquette">{fr.learner.lienPersonnel}</p>
            <a
              href={lien}
              className="block break-all rounded-bloc bg-vitrine-lavande px-3 py-2 text-sm text-vitrine-violet-fonce underline"
            >
              {lien}
            </a>
            <CopierLien lien={lien} />
            <p className="mt-4 text-sm text-slate-700">{fr.inscription.succesLien}</p>
            <p className="mt-2 text-sm text-slate-500">{fr.inscription.succesConseil}</p>
          </Bloc>
        </LearnerShell>
      )
    }
  }

  const erreur = searchParams.e ? MESSAGES[searchParams.e] : null

  /** « Étape n sur 3 » au-dessus de chaque bloc : on sait où on en est. */
  const Etape = ({ n, titre }: { n: number; titre: string }) => (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-vitrine-violet">
        {fr.inscription.etape} {n} {fr.inscription.sur} 3
      </p>
      <h2 className="titre mt-1 text-lg">{titre}</h2>
    </div>
  )

  return (
    <LearnerShell title={fr.inscription.titre} vitrine avecAccent accueilHref="/" fond="espace">
      <p className="-mt-3 mb-5 text-sm text-white/75">{fr.inscription.sousTitre}</p>
      {erreur ? <Alerte>{erreur}</Alerte> : null}

      <form action={inscrire} className="space-y-3">
        <input type="hidden" name="cohortId" value={cohort.id} />

        <Bloc className="space-y-4">
          <Etape n={1} titre={fr.inscription.identite} />
          <div>
            <label className="etiquette" htmlFor="fullName">
              {fr.inscription.nomComplet}
            </label>
            <input
              id="fullName"
              name="fullName"
              required
              maxLength={120}
              autoComplete="name"
              placeholder={fr.inscription.nomExemple}
              className="champ"
            />
          </div>
          <div>
            <label className="etiquette" htmlFor="phone">
              {fr.inscription.telephone}
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={30}
              className="champ"
            />
            <p className="mt-1 text-xs text-slate-500">{fr.inscription.telephoneAide}</p>
          </div>
          <div>
            <label className="etiquette" htmlFor="email">
              {fr.inscription.email}{' '}
              <span className="font-normal text-slate-500">({fr.app.facultatif})</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={160}
              className="champ"
            />
          </div>
        </Bloc>

        <Bloc className="space-y-5">
          <Etape n={2} titre={fr.inscription.situation} />

          <fieldset>
            <legend className="etiquette">{fr.inscription.statutEmploi}</legend>
            <div className="space-y-2">
              {Object.entries(fr.inscription.statutOptions).map(([value, label]) => (
                <label key={value} className="option">
                  <input
                    type="radio"
                    name="statut"
                    value={value}
                    required
                    className="h-5 w-5 shrink-0 accent-vitrine-violet"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="etiquette">{fr.inscription.outilsIa}</legend>
            <p className="mb-2 text-xs text-slate-500">{fr.inscription.outilsIaAide}</p>
            <div className="space-y-2">
              {Object.entries(fr.inscription.outilsOptions).map(([value, label]) => (
                <label key={value} className="option">
                  <input
                    type="checkbox"
                    name="outils"
                    value={value}
                    className="h-5 w-5 shrink-0 accent-vitrine-violet"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="etiquette">{fr.inscription.confiance}</legend>
            <p className="mb-2 text-xs text-slate-500">{fr.inscription.confianceAide}</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="option flex-1 !flex-col !gap-1 !p-2 text-center">
                  <input
                    type="radio"
                    name="confiance"
                    value={n}
                    required
                    className="h-5 w-5 accent-vitrine-violet"
                  />
                  <span className="titre text-lg">{n}</span>
                </label>
              ))}
            </div>
            {/* Les deux bouts de l'échelle, en clair. */}
            <div className="mt-1.5 flex justify-between text-xs font-semibold text-slate-500">
              <span>{fr.inscription.confianceMin}</span>
              <span>{fr.inscription.confianceMax}</span>
            </div>
          </fieldset>

          <div>
            <label className="etiquette" htmlFor="objectif">
              {fr.inscription.objectif}
            </label>
            <textarea
              id="objectif"
              name="objectif"
              required
              rows={3}
              maxLength={500}
              placeholder={fr.inscription.objectifExemple}
              className="champ"
            />
            <p className="mt-1 text-xs text-slate-500">{fr.inscription.objectifAide}</p>
          </div>
        </Bloc>

        <Bloc className="space-y-3">
          <Etape n={3} titre={fr.inscription.consentements} />
          <label className="option !items-start">
            <input
              type="checkbox"
              name="consentCommunity"
              className="mt-0.5 h-5 w-5 shrink-0 accent-vitrine-violet"
            />
            <span className="text-sm">{fr.inscription.consentCommunaute}</span>
          </label>
          <label className="option !items-start">
            <input
              type="checkbox"
              name="consentData"
              required
              className="mt-0.5 h-5 w-5 shrink-0 accent-vitrine-violet"
            />
            <span className="text-sm">{fr.inscription.consentDonnees}</span>
          </label>
        </Bloc>

        <button type="submit" className="bouton-principal !mt-6">
          {fr.inscription.soumettre}
          <span className="fleche" aria-hidden="true">
            ↗
          </span>
        </button>
      </form>
    </LearnerShell>
  )
}
