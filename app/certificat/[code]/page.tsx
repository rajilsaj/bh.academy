import Link from 'next/link'
import { fr } from '@/lib/i18n/fr'
import { policeAccent, policeTitre } from '@/lib/fonts'
import { formatDate, formatPercent } from '@/lib/format'
import { appUrl } from '@/lib/config'
import { getCertificateByCode } from '@/lib/queries'
import { LogoFondation } from '@/components/LogoFondation'

export const dynamic = 'force-dynamic'

/**
 * Page publique de vérification. C'est elle qui donne sa valeur au certificat :
 * un employeur saisit le code et voit la réponse, sans passer par la Fondation.
 * Aucun jeton n'est nécessaire, et rien d'autre que le nom n'est exposé.
 */
export default async function CertificatPage({ params }: { params: { code: string } }) {
  const certificat = await getCertificateByCode(decodeURIComponent(params.code))

  if (!certificat) {
    return (
      <div className={`${policeTitre.variable} panneau-violet min-h-screen`}>
        <main className="mx-auto max-w-lg px-4 py-16">
          <div className="carte text-center">
            <h1 className="titre text-2xl">{fr.certificat.introuvable}</h1>
            <p className="mt-3 text-sm text-slate-600">{fr.certificat.introuvableDetail}</p>
            {/* Retour à l'accueil par la marque — en couleur, la carte est blanche. */}
            <LogoFondation variante="couleur" hauteur="h-10" href="/" className="mt-6" />
          </div>
        </main>
      </div>
    )
  }

  const lien = `${appUrl()}/certificat/${certificat.code}`

  return (
    <div
      className={`${policeTitre.variable} ${policeAccent.variable} panneau-violet min-h-screen print:bg-white`}
    >
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="succes sans-impression mb-4 text-center">{fr.certificat.valide}</p>

        <article className="carte relative overflow-hidden border-4 border-vitrine-jaune !p-8 text-center">
          {/* La marque de l'émetteur, en couleur : elle s'imprime, le blanc non. */}
          <LogoFondation variante="couleur" hauteur="h-12 sm:h-14" className="mb-4" />
          <p className="text-xs uppercase tracking-[0.25em] text-vitrine-violet">
            {fr.app.baseline}
          </p>

          <h1 className="titre mt-4 text-3xl text-slate-900">{fr.certificat.titre}</h1>

          <p className="mt-8 text-sm text-slate-500">{fr.certificat.delivreA}</p>
          <p className="manuscrit mt-1 text-5xl !text-vitrine-violet">
            {certificat.full_name}
          </p>

          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-slate-700">
            {fr.certificat.atteste}
          </p>

          <div className="mt-8 grid gap-4 border-t border-slate-200 pt-6 text-left sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">{fr.certificat.avancement}</p>
              <p className="titre text-xl text-slate-900">
                {formatPercent(certificat.progress_pct)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">{fr.certificat.delivreLe}</p>
              <p className="titre text-xl text-slate-900">{formatDate(certificat.issued_on)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">{fr.certificat.code}</p>
              <p className="font-mono text-sm font-bold tracking-wider text-slate-900">
                {certificat.code}
              </p>
            </div>
          </div>

          <p className="mt-6 text-xs text-slate-400">
            {fr.certificat.verifier} — {lien}
          </p>
        </article>

        <div className="sans-impression mt-6 text-center">
          <Link href="/" className="bouton-fantome">
            {fr.app.retour}
          </Link>
        </div>
      </main>
    </div>
  )
}
