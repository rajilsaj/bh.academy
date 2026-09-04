import type { Metadata } from 'next'
import Link from 'next/link'
import { asc } from 'drizzle-orm'
import { LogoIalab } from '@/components/LogoIalab'
import { LogoFondation } from '@/components/LogoFondation'
import { Photo } from '@/components/Photo'
import { db } from '@/lib/db'
import { cohorts } from '@/lib/db/schema'
import { policeTitre } from '@/lib/fonts'
import { modeEconomie } from '@/lib/economie'
import { fr } from '@/lib/i18n/fr'
import type { PHOTOS } from '@/lib/photos'

export const dynamic = 'force-dynamic'

const t = fr.vitrine.iaLab
const v = fr.vitrine

export const metadata: Metadata = { title: `${t.titre} — ${fr.app.nom}` }

/** Une section : texte d'un côté, photo de l'autre, en alternance. */
function Section({
  titre,
  photo,
  alt,
  inverse = false,
  children,
}: {
  titre: string
  photo: keyof typeof PHOTOS
  alt: string
  inverse?: boolean
  children: React.ReactNode
}) {
  return (
    <section className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
      <div className={inverse ? 'md:order-2' : ''}>
        <h2 className="titre text-2xl text-vitrine-bleu sm:text-3xl">{titre}</h2>
        <div className="mt-4 space-y-3 text-lg leading-relaxed text-slate-800">{children}</div>
      </div>
      <div className={`overflow-hidden rounded-carte shadow-lg ${inverse ? 'md:order-1' : ''}`}>
        <Photo nom={photo} alt={alt} sizes="(min-width: 768px) 45vw, 100vw" className="h-auto w-full object-cover" />
      </div>
    </section>
  )
}

/**
 * « Qui sommes-nous » de l'IA Lab, dans la charte du site de la Fondation :
 * bandeau bleu clair, fond blanc, titres bleus, photo en vis-à-vis de chaque
 * texte. La formation y figure comme projet du lab.
 */
export default async function IaLabPage() {
  const [cohorte] = await db.select().from(cohorts).orderBy(asc(cohorts.startsOn)).limit(1)
  const lienInscription = cohorte ? `/inscription/${cohorte.id}` : '/'
  const polices = modeEconomie() ? '' : policeTitre.variable

  const liens = [
    { href: '/', label: v.nav.accueil },
    { href: '/#programme', label: v.nav.programme },
    { href: '/presse', label: v.nav.presse },
    { href: '/mon-espace', label: v.nav.connexion },
  ]

  return (
    <div className={`${polices} min-h-screen bg-white text-slate-900`}>
      {/* ---------------------------------------------------------- en-tête */}
      <header className="bg-gradient-to-r from-vitrine-bleu to-vitrine-bleu-clair/40 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <LogoFondation hauteur="h-8 sm:h-9" href="/" />
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-lg font-semibold">
            {liens.map((l) => (
              <Link key={l.href} href={l.href} className="hover:underline underline-offset-4">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* ------------------------------------------------------------- héros */}
      <section className="bg-gradient-to-b from-vitrine-bleu-clair to-white">
        <div className="mx-auto max-w-4xl px-5 pb-12 pt-14 text-center sm:px-8 sm:pt-20">
          <LogoIalab title="ia.lab" className="mx-auto h-24 w-auto text-vitrine-bleu sm:h-36 lg:h-44" />
          <p className="mt-8 text-pretty text-lg leading-relaxed text-slate-800 sm:text-xl">{t.intro}</p>
        </div>
      </section>

      {/* ---------------------------------------------------------- sections */}
      <div className="mx-auto max-w-6xl space-y-16 px-5 py-12 sm:px-8 lg:space-y-24 lg:py-16">
        <Section titre={t.pourquoiTitre} photo="ialabPourquoi" alt={t.photoPourquoi}>
          <p>{t.pourquoiTexte}</p>
        </Section>

        <Section titre={t.approcheTitre} photo="ialabApproche" alt={t.photoApproche} inverse>
          <p>{t.approcheTexte}</p>
        </Section>

        <Section titre={t.domainesTitre} photo="ialabIntervention" alt={t.photoIntervention}>
          <p>{t.domainesTexte}</p>
          <ul className="flex flex-wrap gap-2 pt-2">
            {t.domainesListe.map((d) => (
              <li key={d} className="rounded-full bg-vitrine-bleu-clair px-3 py-1 text-lg font-semibold text-vitrine-bleu">
                {d}
              </li>
            ))}
          </ul>
        </Section>

        {/* ---------------------------------------------------------- projets */}
        <section>
          <h2 className="titre text-2xl text-vitrine-bleu sm:text-3xl">{t.projetsTitre}</h2>
          <div className="mt-6 grid items-center gap-6 overflow-hidden rounded-carte bg-vitrine-violet text-white md:grid-cols-2">
            <div className="p-6 sm:p-8">
              <p className="text-lg font-semibold uppercase tracking-[0.2em] text-vitrine-turquoise">{t.projetFormationAccroche}</p>
              <p className="titre mt-2 text-2xl leading-tight sm:text-3xl">{fr.inscription.sousTitre}</p>
              <p className="mt-3 text-lg leading-relaxed text-white/85">{t.projetFormationTexte}</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/" className="bouton-principal !py-3 !text-base sm:w-auto">
                  {t.projetFormationBouton}
                </Link>
                <Link href={lienInscription} className="inline-flex items-center justify-center rounded-full border-2 border-white/40 px-5 py-2.5 text-lg font-semibold text-white hover:bg-white/10">
                  {v.nav.inscription}
                </Link>
              </div>
            </div>
            <Photo nom="certificat" alt={v.photos.certificat} sizes="(min-width: 768px) 45vw, 100vw" className="h-64 w-full object-cover md:h-full" />
          </div>
        </section>

        {/* ---------------------------------------------------------- contact */}
        <section className="text-center">
          <p className="titre mx-auto max-w-3xl text-balance text-2xl text-vitrine-bleu sm:text-3xl">{t.contactTitre}</p>
          <p className="titre mt-2 text-2xl text-vitrine-bleu sm:text-3xl">{t.contactTexte}</p>
          <a href={`mailto:${t.contactEmail}`} className="mt-8 inline-flex items-center justify-center rounded-full bg-vitrine-bleu px-8 py-3.5 text-lg font-bold text-white transition-colors hover:bg-vitrine-vert">
            {t.contactBouton}
          </a>
        </section>
      </div>

      {/* --------------------------------------------------------------- pied */}
      <footer className="bg-vitrine-violet text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-3">
          <div className="md:col-span-1">
            <LogoFondation hauteur="h-9" />
            <p className="mt-4 text-lg leading-relaxed text-white/80">{t.fondation}</p>
          </div>
          <div>
            <p className="text-lg font-bold uppercase tracking-wider text-vitrine-turquoise">{t.explorer}</p>
            <ul className="mt-3 space-y-2 text-lg">
              {liens.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:underline underline-offset-4">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-lg font-bold uppercase tracking-wider text-vitrine-turquoise">{t.contactKicker}</p>
            <ul className="mt-3 space-y-2 text-lg">
              <li><a href={`tel:${t.contactTelephoneLien}`} className="hover:underline underline-offset-4">{t.contactTelephone}</a></li>
              <li><a href={`mailto:${t.contactEmail}`} className="hover:underline underline-offset-4">{t.contactEmail}</a></li>
              <li className="text-white/80">{t.contactAdresse}</li>
            </ul>
          </div>
        </div>
        <p className="border-t border-white/15 px-5 py-4 text-center text-lg text-white/70">
          {v.copyright.replace('{annee}', String(new Date().getFullYear()))}
        </p>
      </footer>
    </div>
  )
}
