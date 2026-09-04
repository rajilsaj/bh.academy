import type { Metadata } from 'next'
import Link from 'next/link'
import { asc } from 'drizzle-orm'
import { Bloc, LearnerShell } from '@/components/LearnerShell'
import { db } from '@/lib/db'
import { cohorts } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'

export const dynamic = 'force-dynamic'

const t = fr.vitrine.iaLab

export const metadata: Metadata = { title: `${t.titre} — ${fr.app.nom}` }

/** Un intertitre de section : le mot-clé en petit, le titre dessous. */
function Section({ kicker, titre, children }: { kicker: string; titre: string; children: React.ReactNode }) {
  return (
    <Bloc>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-vitrine-vert">{kicker}</p>
      <h2 className="titre mt-1 text-2xl">{titre}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">{children}</div>
    </Bloc>
  )
}

/**
 * « Qui sommes-nous » de l'IA Lab : sa raison d'être, sa démarche, ses
 * domaines, ses projets — dont cette formation — et comment le joindre.
 */
export default async function IaLabPage() {
  const [cohorte] = await db.select().from(cohorts).orderBy(asc(cohorts.startsOn)).limit(1)
  const lienInscription = cohorte ? `/inscription/${cohorte.id}` : '/'

  return (
    <LearnerShell title={t.titre} vitrine avecAccent accueilHref="/" fond="espace" large>
      <p className="-mt-3 mb-6 text-pretty text-lg leading-snug text-white/85">{t.intro}</p>

      <div className="space-y-4">
        <Section kicker={t.pourquoiKicker} titre={t.pourquoiTitre}>
          <p>{t.pourquoiTexte}</p>
        </Section>

        <Section kicker={t.approcheKicker} titre={t.approcheTitre}>
          <p>{t.approcheTexte}</p>
        </Section>

        <Section kicker={t.domainesKicker} titre={t.domainesTitre}>
          <p>{t.domainesTexte}</p>
          <ul className="flex flex-wrap gap-2 pt-1">
            {t.domainesListe.map((d) => (
              <li key={d} className="rounded-full bg-vitrine-lavande px-3 py-1 text-sm font-semibold text-vitrine-violet">
                {d}
              </li>
            ))}
          </ul>
        </Section>

        {/* -------------------------------------------------------- projets */}
        <Bloc className="!bg-vitrine-violet-clair !text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-vitrine-turquoise">{t.projetsKicker}</p>
          <h2 className="titre mt-1 text-2xl">{t.projetsTitre}</h2>
          <div className="mt-4 rounded-bloc border border-white/20 bg-white/10 p-4">
            <p className="manuscrit text-2xl text-vitrine-turquoise">{t.projetFormationAccroche}</p>
            <p className="titre mt-1 text-xl">{fr.inscription.sousTitre}</p>
            <p className="mt-2 text-sm leading-relaxed text-white/85">{t.projetFormationTexte}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link href="/#programme" className="bouton-principal !py-3 !text-base sm:w-auto">
                {t.projetFormationBouton}
              </Link>
              <Link href={lienInscription} className="inline-flex items-center justify-center rounded-full border-2 border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
                {fr.vitrine.nav.inscription}
              </Link>
            </div>
          </div>
        </Bloc>

        {/* -------------------------------------------------------- contact */}
        <Bloc className="text-center">
          <p className="titre text-2xl">{t.contactTitre}</p>
          <p className="mt-2 text-sm text-slate-700">{t.contactTexte}</p>
          <a href={`mailto:${t.contactEmail}`} className="bouton-principal mt-4 !py-3 !text-base sm:w-auto">
            {t.contactBouton}
          </a>
          <div className="mt-5 space-y-1 text-sm text-slate-600">
            <p>
              <a href={`tel:${t.contactTelephoneLien}`} className="font-semibold text-vitrine-violet">{t.contactTelephone}</a>
              {' · '}
              <a href={`mailto:${t.contactEmail}`} className="font-semibold text-vitrine-violet">{t.contactEmail}</a>
            </p>
            <p>{t.contactAdresse}</p>
          </div>
        </Bloc>

        <p className="text-center text-sm text-white/70">{t.fondation}</p>
      </div>
    </LearnerShell>
  )
}
