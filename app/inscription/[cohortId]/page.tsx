import { eq } from 'drizzle-orm'
import { Alerte, Bloc, LearnerShell } from '@/components/LearnerShell'
import { CopierLien } from '@/components/CopierLien'
import { AssistantInscription, type EtapeInscription } from '@/components/inscription/AssistantInscription'
import { db } from '@/lib/db'
import { cohorts, learners } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { appUrl } from '@/lib/config'
import { inscrire } from './actions'

export const dynamic = 'force-dynamic'

const t = fr.inscription

const MESSAGES: Record<string, string> = {
  manquant: t.champManquant,
  consent: t.consentDonneesRequis,
  telephone: t.telephoneInvalide,
  email: t.emailInvalide,
  cohorte: t.cohorteIntrouvable,
}

/** « Étape n sur 3 » au-dessus de chaque bloc : on sait où on en est, avec ou sans JavaScript. */
function Etape({ n, titre }: { n: number; titre: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-vitrine-violet">
        {t.etape} {n} {t.sur} 3
      </p>
      <h2 className="titre mt-1 text-lg">{titre}</h2>
    </div>
  )
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
      <LearnerShell title={t.cohorteIntrouvable} accueilHref="/" fond="espace">
        <Bloc>
          <p className="text-slate-700">{t.cohorteFermee}</p>
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
        <LearnerShell title={t.succesTitre} vitrine avecAccent accueilHref="/" fond="espace">
          <Bloc className="text-center">
            <p className="manuscrit text-4xl">{fr.learner.merci}</p>
            <p className="mt-4 text-sm text-slate-600">{t.succesIntro}</p>
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
            <p className="mt-4 text-sm text-slate-700">{t.succesLien}</p>
            <p className="mt-2 text-sm text-slate-500">{t.succesConseil}</p>
          </Bloc>
        </LearnerShell>
      )
    }
  }

  const erreur = searchParams.e ? MESSAGES[searchParams.e] : null

  /*
   * Les trois étapes sont rendues ici, côté serveur, et confiées à l'assistant
   * qui les montre une par une. Sans JavaScript, elles s'affichent toutes.
   */
  const etapes: EtapeInscription[] = [
    {
      cle: 'identite',
      titre: t.identite,
      contenu: (
        <Bloc className="space-y-4">
          <Etape n={1} titre={t.identite} />
          <div>
            <label className="etiquette" htmlFor="fullName">
              {t.nomComplet}
            </label>
            <input
              id="fullName"
              name="fullName"
              required
              maxLength={120}
              autoComplete="name"
              placeholder={t.nomExemple}
              className="champ"
            />
          </div>
          <div>
            <label className="etiquette" htmlFor="phone">
              {t.telephone}
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
            <p className="mt-1 text-xs text-slate-500">{t.telephoneAide}</p>
          </div>
          <div>
            <label className="etiquette" htmlFor="email">
              {t.email} <span className="font-normal text-slate-500">({fr.app.facultatif})</span>
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
      ),
    },
    {
      cle: 'situation',
      titre: t.situation,
      contenu: (
        <Bloc className="space-y-5">
          <Etape n={2} titre={t.situation} />

          <fieldset>
            <legend className="etiquette">{t.statutEmploi}</legend>
            <div className="space-y-2">
              {Object.entries(t.statutOptions).map(([value, label]) => (
                <label key={value} className="option">
                  <input type="radio" name="statut" value={value} required className="h-5 w-5 shrink-0 accent-vitrine-violet" />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="etiquette">{t.outilsIa}</legend>
            <p className="mb-2 text-xs text-slate-500">{t.outilsIaAide}</p>
            <div className="space-y-2">
              {Object.entries(t.outilsOptions).map(([value, label]) => (
                <label key={value} className="option">
                  <input type="checkbox" name="outils" value={value} className="h-5 w-5 shrink-0 accent-vitrine-violet" />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="etiquette">{t.confiance}</legend>
            <p className="mb-2 text-xs text-slate-500">{t.confianceAide}</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="option flex-1 !flex-col !gap-1 !p-2 text-center">
                  <input type="radio" name="confiance" value={n} required className="h-5 w-5 accent-vitrine-violet" />
                  <span className="titre text-lg">{n}</span>
                </label>
              ))}
            </div>
            {/* Les deux bouts de l'échelle, en clair. */}
            <div className="mt-1.5 flex justify-between text-xs font-semibold text-slate-500">
              <span>{t.confianceMin}</span>
              <span>{t.confianceMax}</span>
            </div>
          </fieldset>

          <div>
            <label className="etiquette" htmlFor="objectif">
              {t.objectif}
            </label>
            <textarea
              id="objectif"
              name="objectif"
              required
              rows={3}
              maxLength={500}
              placeholder={t.objectifExemple}
              className="champ"
            />
            <p className="mt-1 text-xs text-slate-500">{t.objectifAide}</p>
          </div>
        </Bloc>
      ),
    },
    {
      cle: 'consentements',
      titre: t.consentements,
      contenu: (
        <Bloc className="space-y-3">
          <Etape n={3} titre={t.consentements} />
          <label className="option !items-start">
            <input type="checkbox" name="consentCommunity" className="mt-0.5 h-5 w-5 shrink-0 accent-vitrine-violet" />
            <span className="text-sm">{t.consentCommunaute}</span>
          </label>
          <label className="option !items-start">
            <input type="checkbox" name="consentData" required className="mt-0.5 h-5 w-5 shrink-0 accent-vitrine-violet" />
            <span className="text-sm">{t.consentDonnees}</span>
          </label>
        </Bloc>
      ),
    },
  ]

  return (
    <LearnerShell title={t.titre} vitrine avecAccent accueilHref="/" fond="espace">
      <p className="-mt-3 mb-5 text-sm text-white/75">{t.sousTitre}</p>
      {erreur ? <Alerte>{erreur}</Alerte> : null}

      <AssistantInscription
        action={inscrire}
        cohortId={cohort.id}
        etapes={etapes}
        textes={{
          etape: t.etape,
          sur: t.sur,
          precedent: t.precedent,
          suivant: t.suivant,
          envoyer: t.soumettre,
          recapTitre: t.recapTitre,
          recapAide: t.recapAide,
          erreursTitre: t.erreursTitre,
          nonRenseigne: t.nonRenseigne,
        }}
        champs={{
          fullName: t.nomComplet,
          phone: t.telephone,
          email: t.email,
          statut: t.statutEmploi,
          outils: t.outilsIa,
          confiance: t.confiance,
          objectif: t.objectif,
          consentCommunity: t.consentements,
          consentData: t.consentements,
        }}
        options={{ statut: t.statutOptions, outils: t.outilsOptions }}
        messages={{
          requis: t.champManquant,
          trop_long: t.tropLong,
          telephone: t.telephoneInvalide,
          email: t.emailInvalide,
          consent: t.consentDonneesRequis,
        }}
      />
    </LearnerShell>
  )
}
