import type { Metadata } from 'next'
import { Bloc, LearnerShell } from '@/components/LearnerShell'
import { fr } from '@/lib/i18n/fr'

export const dynamic = 'force-dynamic'

const t = fr.vitrine.presse

export const metadata: Metadata = { title: `${t.titre} — ${fr.app.nom}` }

/** Le trait d'un document, sans image. */
function IconePdf() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 shrink-0 text-vitrine-violet" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  )
}

/**
 * L'espace presse : les documents officiels du programme, à télécharger ou à
 * lire en ligne. Les fichiers sont servis tels quels depuis `public/presse`.
 */
export default function PressePage() {
  return (
    <LearnerShell title={t.titre} vitrine avecAccent accueilHref="/" fond="espace">
      <p className="-mt-3 mb-6 text-sm text-white/75">{t.intro}</p>

      <div className="space-y-3">
        {t.documents.map((d) => (
          <Bloc key={d.fichier}>
            <div className="flex gap-4">
              <IconePdf />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-vitrine-violet">{d.type}</p>
                <h2 className="titre mt-1 text-xl">{d.titre}</h2>
                <p className="mt-2 text-sm text-slate-700">{d.description}</p>
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  PDF · {d.pages} {t.pages} · {d.taille} · {d.date}
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <a href={`/presse/${d.fichier}`} download className="bouton-principal !py-3 !text-base sm:w-auto">
                    {t.telecharger}
                    <span className="fleche" aria-hidden="true">
                      ↓
                    </span>
                  </a>
                  <a
                    href={`/presse/${d.fichier}`}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center justify-center rounded-full border-2 border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-vitrine-violet hover:text-vitrine-violet"
                  >
                    {t.lireEnLigne}
                  </a>
                </div>
              </div>
            </div>
          </Bloc>
        ))}
      </div>

      <Bloc className="mt-3">
        <p className="etiquette">{t.contactTitre}</p>
        <p className="text-sm text-slate-700">{t.contactTexte}</p>
        <a
          href={fr.vitrine.fondationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm font-semibold text-vitrine-violet underline"
        >
          {fr.vitrine.fondationUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
        </a>
      </Bloc>
    </LearnerShell>
  )
}
