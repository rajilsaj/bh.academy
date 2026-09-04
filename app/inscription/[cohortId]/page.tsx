import { eq } from 'drizzle-orm'
import { Alerte, Bloc, LearnerShell } from '@/components/LearnerShell'
import { CopierLien } from '@/components/CopierLien'
import { AssistantInscription, type QuestionInscription } from '@/components/inscription/AssistantInscription'
import { db } from '@/lib/db'
import { cohorts, learners } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { appUrl } from '@/lib/config'
import { googleActive, identiteGoogle } from '@/lib/auth'
import { changerCompteInscription, connexionGoogleInscription, inscrire } from './actions'

export const dynamic = 'force-dynamic'

const t = fr.inscription

const MESSAGES: Record<string, string> = {
  manquant: t.champManquant,
  consent: t.consentDonneesRequis,
  telephone: t.telephoneInvalide,
  email: t.emailInvalide,
  cohorte: t.cohorteIntrouvable,
  google: t.googleRequis,
}

/** « Étape n sur 4 » au-dessus de chaque bloc : on sait où on en est, avec ou sans JavaScript. */
const NB_ETAPES = 4
function Etape({ n, titre }: { n: number; titre: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-vitrine-violet">
        {t.etape} {n} {t.sur} {NB_ETAPES}
      </p>
      <h2 className="titre mt-1 text-lg">{titre}</h2>
    </div>
  )
}

/** Le trait « G » de Google, en quatre couleurs, sans image externe. */
function MarqueGoogle() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.3 7.3 0 0 1-10.9-3.8H1.2v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.2 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.2a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.5-3.5A12 12 0 0 0 1.2 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z" />
    </svg>
  )
}

export default async function InscriptionPage({
  params,
  searchParams,
}: {
  params: { cohortId: string }
  searchParams: { e?: string; nouveau?: string; deja?: string }
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
            {searchParams.deja ? <p className="mb-3 text-sm font-semibold text-vitrine-violet">{t.dejaInscrit}</p> : null}
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
   * Étape 1, obligatoire : le compte Google. Tant qu'il n'y en a pas, rien
   * d'autre ne s'affiche ; l'action `inscrire` le vérifie aussi de son côté.
   */
  const google = await identiteGoogle()
  if (!google) {
    return (
      <LearnerShell title={t.titre} vitrine avecAccent accueilHref="/" fond="espace">
        <p className="-mt-3 mb-5 text-sm text-white/75">{t.sousTitre}</p>
        {erreur ? <Alerte>{erreur}</Alerte> : null}
        <Bloc className="space-y-4">
          <Etape n={1} titre={t.google.etape} />
          <p className="titre text-2xl">{t.google.titre}</p>
          <p className="text-sm text-slate-700">{t.google.texte}</p>
          {googleActive ? (
            <form action={connexionGoogleInscription}>
              <input type="hidden" name="cohortId" value={cohort.id} />
              <button type="submit" className="bouton-principal !gap-3">
                <MarqueGoogle />
                {t.google.bouton}
              </button>
            </form>
          ) : (
            <Alerte>{t.google.indisponible}</Alerte>
          )}
        </Bloc>
      </LearnerShell>
    )
  }

  /*
   * Les questions, une par écran, rendues ici côté serveur et confiées à
   * l'assistant. Sans JavaScript, elles s'affichent toutes à la suite.
   */
  const questions: QuestionInscription[] = [
    {
      champ: 'fullName',
      etape: 'identite',
      titre: t.nomComplet,
      contenu: (
        <input name="fullName" required maxLength={120} autoComplete="name" placeholder={t.nomExemple} defaultValue={google.nom} className="tf-champ" aria-label={t.nomComplet} />
      ),
    },
    {
      champ: 'phone',
      etape: 'identite',
      titre: t.telephone,
      aide: t.telephoneAide,
      facultatif: true,
      contenu: (
        <>
          <input name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} placeholder="06 XXX XX XX" className="tf-champ" aria-label={t.telephone} />
          <input type="hidden" name="email" value={google.email} />
        </>
      ),
    },
    {
      champ: 'statut',
      etape: 'situation',
      titre: t.statutEmploi,
      choixUnique: true,
      contenu: (
        <div className="tf-options">
          {Object.entries(t.statutOptions).map(([value, label], i) => (
            <label key={value} className="tf-option">
              <input type="radio" name="statut" value={value} required className="sr-only" />
              <span className="tf-lettre">{String.fromCharCode(65 + i)}</span>
              <span>{label}</span>
            </label>
          ))}
        </div>
      ),
    },
    {
      champ: 'outils',
      etape: 'situation',
      titre: t.outilsIa,
      aide: t.outilsIaAide,
      facultatif: true,
      contenu: (
        <div className="tf-options">
          {Object.entries(t.outilsOptions).map(([value, label], i) => (
            <label key={value} className="tf-option">
              <input type="checkbox" name="outils" value={value} className="sr-only" />
              <span className="tf-lettre">{String.fromCharCode(65 + i)}</span>
              <span>{label}</span>
            </label>
          ))}
        </div>
      ),
    },
    {
      champ: 'confiance',
      etape: 'situation',
      titre: t.confiance,
      aide: `${t.confianceAide}`,
      choixUnique: true,
      contenu: (
        <div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="tf-option tf-option-note">
                <input type="radio" name="confiance" value={n} required className="sr-only" />
                <span className="titre text-2xl">{n}</span>
              </label>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-lg text-white/60">
            <span>{t.confianceMin}</span>
            <span>{t.confianceMax}</span>
          </div>
        </div>
      ),
    },
    {
      champ: 'objectif',
      etape: 'situation',
      titre: t.objectif,
      aide: t.objectifAide,
      contenu: (
        <textarea name="objectif" required rows={3} maxLength={500} placeholder={t.objectifExemple} className="tf-champ tf-zone" aria-label={t.objectif} />
      ),
    },
    {
      champ: null,
      etape: 'consentements',
      titre: t.consentements,
      contenu: (
        <div className="tf-options">
          <label className="tf-option !items-start">
            <input type="checkbox" name="consentCommunity" className="sr-only" />
            <span className="tf-lettre">A</span>
            <span>{t.consentCommunaute}</span>
          </label>
          <label className="tf-option !items-start">
            <input type="checkbox" name="consentData" required className="sr-only" />
            <span className="tf-lettre">B</span>
            <span>
              {t.consentDonnees} <span className="text-vitrine-jaune">*</span>
            </span>
          </label>
        </div>
      ),
    },
  ]

  return (
    <LearnerShell title={t.titre} vitrine avecAccent accueilHref="/" fond="espace">
      {erreur ? <Alerte>{erreur}</Alerte> : null}

      {/* Étape Google franchie : le compte, et le moyen d'en changer. */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-lg text-white/80">
        <span className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-vitrine-jaune text-xs font-bold text-vitrine-violet-fonce" aria-hidden="true">✓</span>
          {t.google.connecte} <strong className="text-white">{google.email}</strong>
        </span>
        <form action={changerCompteInscription}>
          <input type="hidden" name="cohortId" value={cohort.id} />
          <button type="submit" className="underline decoration-white/50 underline-offset-2 hover:text-white">{t.google.changer}</button>
        </form>
      </div>

      <AssistantInscription
        action={inscrire}
        cohortId={cohort.id}
        questions={questions}
        textes={{
          question: t.question,
          sur: t.sur,
          ok: t.ok,
          entree: t.entree,
          entreeTexte: t.entreeTexte,
          precedent: t.precedent,
          suivant: t.suivant,
          envoyer: t.soumettre,
          facultatif: `(${fr.app.facultatif})`,
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
          consentData: t.consentDonneesRequis,
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
