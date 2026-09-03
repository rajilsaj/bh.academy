import Link from 'next/link'
import { fr } from '@/lib/i18n/fr'
import { policeAccent, policeTitre } from '@/lib/fonts'
import { LogoFondation } from '@/components/LogoFondation'

/**
 * Coquille commune des pages apprenant : panneau bleu quadrillé, contenu en
 * carte blanche. Volontairement pauvre en HTML — ces pages sont consultées en
 * 2G sur des téléphones d'entrée de gamme.
 *
 * Aucune police n'est chargée par défaut : les cinq surfaces apprenant sont
 * consultées en données mobiles et doivent tenir sous 100 Ko. Fredoka coûterait
 * 16 Ko pour un simple effet de titre — l'identité tient déjà au bleu, au
 * jaune et aux rondeurs. Seules les pages vitrine (`vitrine`) la chargent.
 */
export function LearnerShell({
  title,
  backHref,
  parcoursHref,
  accueilHref,
  fond = 'violet',
  vitrine = false,
  avecAccent = false,
  children,
}: {
  title?: string
  backHref?: string
  parcoursHref?: string
  /** Un chemin vers l'accueil : le logo y mène, et un lien « Accueil » apparaît en haut et en bas. */
  accueilHref?: string
  /** `espace` : un ciel étoilé statique en CSS pur, sans rien d'animé — voir `.fond-espace`. */
  fond?: 'violet' | 'espace'
  /** Charge Fredoka (16 Ko). Réservé aux pages sans contrainte de 2G. */
  vitrine?: boolean
  /** Charge en plus la police manuscrite (50 Ko). Vitrine uniquement. */
  avecAccent?: boolean
  children: React.ReactNode
}) {
  const polices = [
    vitrine || avecAccent ? policeTitre.variable : '',
    avecAccent ? policeAccent.variable : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={`${polices} ${fond === 'espace' ? 'fond-espace' : 'panneau-violet'} min-h-screen`}>
      <main className="mx-auto max-w-md px-4 py-6">
        <header className="mb-5 flex items-center justify-between gap-3">
          {/* La marque, pas le mot : 4 Ko de PNG, loin sous le budget de 100 Ko. */}
          <LogoFondation hauteur="h-6" href={accueilHref} />
          {parcoursHref ? (
            <Link href={parcoursHref} className="bouton-fantome !px-3 !py-1.5 !text-xs">
              {fr.parcours.titre}
            </Link>
          ) : accueilHref ? (
            <Link href={accueilHref} className="bouton-fantome !px-3 !py-1.5 !text-xs">
              ← {fr.vitrine.nav.accueil}
            </Link>
          ) : null}
        </header>

        {title ? <h1 className="titre mb-5 text-3xl text-white">{title}</h1> : null}

        {children}

        {backHref ? (
          <p className="mt-8">
            <Link href={backHref} className="text-sm text-white/70 underline">
              {fr.app.retour}
            </Link>
          </p>
        ) : null}
        {accueilHref ? (
          <p className="mt-8 text-center">
            <Link href={accueilHref} className="bouton-fantome">
              ← {fr.app.retourAccueil}
            </Link>
          </p>
        ) : null}
      </main>
    </div>
  )
}

/** Carte blanche : tout ce qui se remplit ou se lit attentivement. */
export function Bloc({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`carte ${className ?? ''}`}>{children}</div>
}

export function LienInvalide() {
  return (
    <LearnerShell title={fr.learner.tokenInvalide}>
      <Bloc>
        <p className="text-slate-700">{fr.learner.tokenInvalideDetail}</p>
      </Bloc>
    </LearnerShell>
  )
}

export function Alerte({ children }: { children: React.ReactNode }) {
  return (
    <p className="alerte mb-4" role="alert">
      {children}
    </p>
  )
}

export function Succes({ children }: { children: React.ReactNode }) {
  return <p className="succes mb-4">{children}</p>
}
