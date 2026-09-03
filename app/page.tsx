import Link from 'next/link'
import { asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { cohorts } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { policeAccent, policeTitre } from '@/lib/fonts'
import {
  Fleche,
  Gribouillis,
  Etoile,
  Calendrier,
  Reseau,
  Prompt,
  Mallette,
  Tableur,
} from '@/components/Decor'
import { ImmersionHeros } from '@/components/ImmersionHeros'
import { ChargementR2 } from '@/components/ChargementR2'
import { Hyperespace } from '@/components/Hyperespace'
import { Signature } from '@/components/Signature'
import { Photo } from '@/components/Photo'
import { LogoFondation } from '@/components/LogoFondation'
import { Partenaires } from '@/components/Partenaires'
import { Formateurs } from '@/components/Formateurs'
import { NettoyerAncre } from '@/components/NettoyerAncre'
import { Medaillon } from '@/components/Medaillon'
import { SectionCourante } from '@/components/SectionCourante'
import { NuagePastilles } from '@/components/NuagePastilles'
import { headers } from 'next/headers'
import { nettoyerQuestion, repondre } from '@/lib/assistant'
import { MARQUES_OUTILS } from '@/components/MarquesIA'

export const dynamic = 'force-dynamic'

const v = fr.vitrine

/** Les quatre arguments, chacun sur sa couleur, comme la grille de la maquette. */
/*
 * Texte sombre sur le vert et le rose : le blanc n'y atteint que ~2,6:1, et
 * un corps léger a besoin de 4,5:1 au minimum. En sombre, on dépasse 7:1.
 */
const ARGUMENTS = [
  { cle: 'pratique', fond: 'bg-vitrine-turquoise', texte: 'text-slate-900' },
  { cle: 'telephone', fond: 'bg-vitrine-vert', texte: 'text-slate-900' },
  { cle: 'suivi', fond: 'bg-vitrine-jaune', texte: 'text-vitrine-violet-fonce' },
  { cle: 'certificat', fond: 'bg-vitrine-rose', texte: 'text-slate-900' },
] as const

/**
 * Les cartes de modules de la maquette : chacune sur sa couleur, avec dans le
 * coin une grande icône tracée qui dit le sujet du module — réseau de
 * neurones, invite de commande, mallette, feuille de calcul. Le contenu vient
 * de `fr.vitrine.modules` ; ici seulement l'habillage, dans l'ordre des
 * modules.
 */
const MODULES_STYLE = [
  { fond: 'bg-vitrine-violet-clair', texte: 'text-white', Icone: Reseau },
  { fond: 'bg-vitrine-turquoise', texte: 'text-slate-900', Icone: Prompt },
  { fond: 'bg-vitrine-jaune', texte: 'text-vitrine-violet-fonce', Icone: Mallette },
  { fond: 'bg-vitrine-vert', texte: 'text-slate-900', Icone: Tableur },
] as const

/* Dans l'ordre de la page : ce qu'on promet, le programme lui-même, les questions. */
const LIENS_NAV = [
  { href: '#apropos', label: v.nav.apropos },
  { href: '#programme', label: v.nav.programme },
  { href: '#questions', label: v.nav.faq },
] as const

export default async function Accueil({ searchParams }: { searchParams?: { q?: string } }) {
  const [cohorte] = await db.select().from(cohorts).orderBy(asc(cohorts.startsOn)).limit(1)
  const lienInscription = cohorte ? `/inscription/${cohorte.id}` : '/admin'

  /*
   * L'assistant de la FAQ passe par un formulaire GET : la question arrive
   * dans l'URL, la page répond au rendu. Fonctionne sans JavaScript, comme
   * tout le reste de la vitrine. L'adresse sert à la limite par visiteur.
   */
  const question = nettoyerQuestion(searchParams?.q)
  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'inconnue'
  const reponse = question ? await repondre(question, ip) : null

  return (
    <div
      className={`${policeTitre.variable} ${policeAccent.variable} relative z-10 overflow-x-clip px-3 pt-3 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8`}
    >
      {/*
        Le fond du site : l'hyperespace, un canvas fixé derrière tout. Sans
        JavaScript il n'existe pas, et la lavande du <body> reprend sa place.
        L'enveloppe passe en `relative z-10` pour rester au-dessus.
      */}
      {/* L'écran de chargement : R2-D2 roule pendant que la page arrive, puis s'efface. */}
      <ChargementR2 />

      <Hyperespace />

      {/*
        Le panneau encadré de la maquette : centré, plafonné en largeur, posé
        sur l'hyperespace. Arrondi en haut seulement — en bas, il se dissout
        dans le fond par le bloc `.fondu-hyperespace` qui le prolonge.
        L'échelle monte jusqu'à 80rem, pour laisser l'hyperespace visible de chaque côté dès 1280 px ; les grilles gagnent des colonnes
        au lieu de simplement s'étirer.

        `overflow-clip`, pas `overflow-hidden` : les deux rognent les angles
        arrondis, mais `hidden` fait du panneau un conteneur de défilement et
        casserait l'en-tête collant. `clip` ne crée aucun conteneur. Même
        raison pour `overflow-x-clip` sur l'enveloppe.
      */}
      <div className="panneau-violet mx-auto max-w-5xl overflow-clip rounded-t-[2rem] shadow-2xl xl:max-w-6xl 2xl:max-w-7xl">
        {/*
          ---------------------------------------------------- navigation
          En-tête collant et translucide : il suit le défilement et glisse
          au-dessus du contenu, qui transparaît flouté derrière. Le lien de la
          section visible se souligne en jaune (voir `SectionCourante`).
        */}
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-4 bg-vitrine-violet/75 px-5 py-4 backdrop-blur-md sm:px-8 lg:px-12">
          <LogoFondation />

          {/* Liens en 300 à 18 px ; le survol et la section courante passent en 700, en douceur. */}
          <nav className="nav-principale hidden gap-6 text-lg font-light tracking-leger text-white md:flex lg:gap-8">
            {LIENS_NAV.map((l) => (
              <a
                key={l.href}
                href={l.href}
                data-section={l.href.slice(1)}
                className="bascule-graisse border-b-2 border-transparent pb-0.5 hover:font-bold hover:tracking-fort aria-[current=true]:border-vitrine-jaune aria-[current=true]:font-bold aria-[current=true]:tracking-fort"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {/*
              Connexion à l'espace formateur — le seul accès par mot de passe
              du site, les apprenants passant par leur lien personnel. Pilule
              secondaire à côté de l'inscription dès `md` ; sur mobile, elle
              rejoint le menu hamburger pour ne pas encombrer l'en-tête.
            */}
            <Link href="/admin" className="bouton-fantome hidden px-6 py-3 text-base md:inline-flex">
              {v.nav.connexion}
            </Link>
            <Link href={lienInscription} className="bouton-pilule px-6 py-3 text-base">
              {v.nav.inscription}
              <span className="fleche" aria-hidden="true">
                ↗
              </span>
            </Link>

            {/*
              Menu mobile en <details> : les liens de section disparaissaient
              purement et simplement sous 768 px, sans rien pour les remplacer.
              L'élément natif ouvre et ferme sans une ligne de JavaScript.
            */}
            <details className="group relative md:hidden">
              <summary
                className="bouton-fantome cursor-pointer list-none [&::-webkit-details-marker]:hidden"
                aria-label={v.nav.menu}
              >
                <span aria-hidden="true">☰</span>
                <span className="sr-only">{v.nav.menu}</span>
              </summary>
              <nav className="absolute right-0 top-full z-30 mt-2 flex w-56 flex-col gap-1 rounded-bloc border-2 border-white/25 bg-vitrine-violet-fonce p-2 shadow-2xl">
                {LIENS_NAV.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    className="rounded-full px-4 py-2.5 text-base font-semibold text-white active:bg-white/10"
                  >
                    {l.label}
                  </a>
                ))}
                <Link
                  href="/admin"
                  className="mt-1 rounded-full border-t border-white/15 px-4 pb-2.5 pt-3.5 text-base font-semibold text-vitrine-jaune active:bg-white/10"
                >
                  {v.nav.connexion}
                </Link>
              </nav>
            </details>
          </div>
        </header>

        {/* ---------------------------------------------------------- héros */}
        <section className="relative px-5 pb-10 pt-6 text-center sm:px-8 lg:px-12 lg:pb-16 lg:pt-10">
          {/*
            Couches de parallaxe. Trois profondeurs : les halos dérivent
            lentement (loin), les gribouillis plus vite (près). Purement
            décoratives, donc `aria-hidden` et hors du flux.
          */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="parallaxe-fond absolute -left-24 -top-16 h-72 w-72 rounded-full bg-vitrine-turquoise/25 blur-3xl lg:h-96 lg:w-96" />
            <div className="parallaxe-fond absolute -right-20 top-24 h-64 w-64 rounded-full bg-vitrine-rose/25 blur-3xl lg:h-80 lg:w-80" />
            <div className="parallaxe-lent absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-vitrine-jaune/15 blur-3xl" />
          </div>

          {/* Médaillon FONEA à gauche, à la place du simple gribouillis. */}
          <Medaillon />
          <Etoile className="relief-svg parallaxe-lent absolute right-8 top-8 hidden h-12 w-12 text-vitrine-rose lg:block xl:h-16 xl:w-16" />

          <div className="relative z-10">
            {/*
              Hiérarchie de l'affiche : l'intitulé complet en grand, puis la
              ligne d'accroche en dessous, plus petite. Le mot manuscrit reste
              court — c'est un accent de la charte, pas une phrase.
            */}
            {/* Plafonné à 6xl : au-delà, « L'INTELLIGENCE » passait sous le médaillon FONEA. */}
            <h1 className="titre mx-auto max-w-4xl text-balance text-4xl uppercase sm:text-5xl lg:max-w-5xl lg:text-6xl">
              {v.heroTitre}
            </h1>
            {/* L'accroche entière en manuscrit turquoise, grande — le « never before » de la maquette. */}
            <p className="manuscrit mx-auto mt-2 max-w-3xl text-balance text-4xl sm:text-5xl lg:mt-3 lg:text-6xl">
              {v.heroAccroche} {v.heroManuscrit}
            </p>

            <p className="texte-leger mx-auto mt-5 max-w-xl text-pretty text-white lg:mt-7 lg:max-w-2xl lg:text-xl">
              {v.heroSousTitre}
            </p>

            <div className="mx-auto mt-7 flex max-w-xs flex-col items-center gap-3 sm:max-w-none sm:flex-row sm:justify-center">
              <Link href={lienInscription} className="bouton-principal sm:w-auto">
                {v.heroBouton}
                <span className="fleche" aria-hidden="true">
                  ↗
                </span>
              </Link>
              <a href="#programme" className="bouton-fantome">
                {v.heroSecondaire}
              </a>
            </div>

            {/*
              Sous `xl`, le médaillon FONEA et les armoiries flottantes sont
              masqués : le bandeau prend le relais, dans l'ordre BantuHub,
              Fondation, FONEA, République.
            */}
            <Partenaires className="mt-8 xl:hidden" />


            {/*
              Bandeau d'ouverture. Seule image chargée sans attendre : c'est la
              plus grande surface visible au premier écran, donc celle qui
              décide du ressenti de rapidité.
            */}
            <ImmersionHeros />
          </div>

        </section>

        {/* ------------------------------------------------------- chiffres */}
        <section className="parallaxe-apparition px-5 pb-10 sm:px-8 lg:px-12 lg:pb-14">
          <div className="grid gap-3 sm:grid-cols-3 lg:gap-5">
            {v.chiffres.map((c) => (
              <div
                key={c.t}
                className="carte-violette relative flex h-full min-h-[11rem] flex-col justify-between overflow-hidden lg:min-h-[13rem] lg:p-7"
              >
                {/* Le chiffre en filigrane, énorme et presque transparent : il remplit le fond. */}
                <span
                  aria-hidden
                  className="titre pointer-events-none absolute -bottom-8 -right-3 select-none text-[9rem] leading-none text-white/[0.07] lg:text-[11rem]"
                >
                  {c.n}
                </span>
                <p className="relative text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  {c.k}
                </p>
                <p className="titre relative mt-3 text-6xl leading-none text-vitrine-jaune lg:text-7xl">
                  {c.n}
                </p>
                <p className="relative mt-3 max-w-[14rem] text-lg leading-snug text-white lg:text-xl">
                  <span className="font-semibold">{c.k}</span>{' '}
                  <span className="texte-leger">{c.t}</span>
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------- tarif / CTA */}
        <section className="parallaxe-apparition px-5 pb-12 sm:px-8 lg:px-12">
          <div className="carte relative flex flex-col items-center gap-4 sm:flex-row sm:justify-between lg:p-8">
            <div>
              <p className="titre text-3xl text-slate-900 lg:text-4xl">
                {v.prixTitre} <span className="text-vitrine-violet">{v.prixValeur}</span>
              </p>
              <p className="texte-leger mt-1 text-slate-700">{v.prixDetail}</p>
            </div>
            {/* La durée et la période, collées au bouton. */}
            <div className="flex items-center gap-3 rounded-full border-2 border-vitrine-lavande-fonce py-2 pl-4 pr-5 sm:ml-auto">
              <Calendrier className="h-6 w-6 shrink-0 text-vitrine-violet" />
              <div className="text-left leading-tight">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-vitrine-violet">
                  {v.prixDureeLabel}
                </p>
                <p className="whitespace-nowrap text-lg font-bold tracking-fort text-slate-900">
                  {v.prixDuree}
                </p>
              </div>
            </div>
            <Link href={lienInscription} className="bouton-pilule shrink-0">
              {v.prixBouton}
              <span className="fleche" aria-hidden="true">
                ↗
              </span>
            </Link>
          </div>
        </section>

        {/* ------------------------------------------------------ arguments */}
        <section id="apropos" className="parallaxe-apparition px-5 pb-12 sm:px-8 lg:px-12 lg:pb-16">
          {/*
            Titre à gauche, nuage de pastilles à droite — la disposition de la
            maquette pour « Multiply the fun ». Le nuage reprend celui du héros
            en grappe resserrée ; sous `md` il n'y a pas la place, et le héros
            l'a déjà montré.
          */}
          <div className="md:flex md:items-start md:justify-between md:gap-8">
            <h2 className="titre text-balance text-3xl sm:text-4xl lg:text-5xl">
              {v.argumentsTitre} <span className="manuscrit">{v.argumentsManuscrit}</span>
              <br />
              {v.argumentsTitre2}{' '}
              <span className="manuscrit text-vitrine-jaune">{v.argumentsManuscrit2}</span>
            </h2>
            <NuagePastilles nuage className="hidden md:flex md:mt-1 md:shrink-0" />
          </div>

          {/* Quatre colonnes sur grand écran : la grille se densifie au lieu de s'étirer. */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:mt-8 lg:gap-5 xl:grid-cols-4">
            {ARGUMENTS.map(({ cle, fond, texte }) => {
              const a = v.args[cle]
              return (
                <article key={cle} className={`overflow-hidden rounded-carte ${fond} ${texte}`}>
                  <Photo
                    nom={cle}
                    alt={v.photos[cle]}
                    sizes="(min-width: 1536px) 21rem, (min-width: 1280px) 23vw, (min-width: 640px) 45vw, 92vw"
                    className="h-40 w-full object-cover lg:h-44"
                  />
                  {/*
                    Le titre, une ligne chiffre + légende, deux points. Les
                    chiffres portent des espaces insécables et ne se coupent
                    jamais ; `text-pretty` évite le mot seul en fin de ligne.
                  */}
                  <div className="p-5 lg:p-6">
                    <h3 className="titre text-balance text-xl lg:text-2xl">{a.titre}</h3>
                    <p className="mt-2 flex items-baseline gap-2">
                      <span className="titre text-3xl leading-none">{a.chiffre.n}</span>
                      <span className="text-lg font-semibold">{a.chiffre.t}</span>
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {a.points.map((p) => (
                        <li key={p} className="flex gap-2">
                          <span aria-hidden className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
                          <span className="texte-leger text-lg text-pretty leading-snug">{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        {/* -------------------------------------------------------- parcours */}
        <section id="programme" className="parallaxe-apparition px-5 pb-12 sm:px-8 lg:px-12 lg:pb-16">
          <h2 className="titre text-balance text-3xl sm:text-4xl lg:text-5xl">
            {v.parcoursTitre} <span className="manuscrit">{v.parcoursManuscrit}</span>
          </h2>
          <p className="texte-leger mt-3 max-w-2xl text-pretty text-white">
            {v.parcoursSousTitre}
          </p>

          {/* Deux colonnes de grandes cartes de couleur, comme dans la maquette. */}
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:mt-8 lg:gap-6">
            {v.modules.map((m, i) => {
              const s = MODULES_STYLE[i % MODULES_STYLE.length]
              return (
                <li
                  key={m.titre}
                  className={`relative overflow-hidden rounded-carte p-6 lg:p-8 ${s.fond} ${s.texte}`}
                >
                  {/* L'icône du module : grande, en trait, en filigrane dans le coin. */}
                  <s.Icone className="absolute -right-6 -top-6 h-36 w-36 opacity-25 lg:h-44 lg:w-44" />
                  <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-90">
                    {v.moduleLabel} {i + 1}
                  </p>
                  <h3 className="titre mt-2 max-w-[78%] text-balance text-2xl leading-tight lg:text-3xl">
                    {m.titre}
                  </h3>
                  <p className="texte-leger mt-3 max-w-prose">
                    {m.texte}
                  </p>
                  {/* Les outils nommés dans le texte, avec leur marque. */}
                  {'outils' in m && m.outils ? (
                    <ul className="mt-4 flex flex-wrap gap-2" aria-label={v.moduleOutils}>
                      {m.outils.map((o) => {
                        const Marque = MARQUES_OUTILS[o]
                        return (
                          <li
                            key={o}
                            className="inline-flex items-center gap-2 rounded-full bg-white/15 py-1.5 pl-2.5 pr-3.5 text-sm font-bold tracking-fort"
                          >
                            <Marque className="h-5 w-5 shrink-0" />
                            {o}
                          </li>
                        )
                      })}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ol>
        </section>

        {/* ------------------------------------------------------------ FAQ */}
        <section id="questions" className="parallaxe-apparition px-5 pb-12 sm:px-8 lg:px-12 lg:pb-16">
          <h2 className="titre mb-5 text-3xl sm:text-4xl lg:text-5xl">
            {v.faqTitre}
            <Fleche className="ml-3 inline h-6 w-10 text-vitrine-turquoise" />
          </h2>
          {/* <details> : l'accordéon fonctionne sans JavaScript. */}
          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {v.faq.map((item) => (
              <details key={item.q} className="faq lg:self-start">
                <summary>{item.q}</summary>
                <p className="texte-leger border-t border-white/15 px-4 py-3 text-white">
                  {item.r}
                </p>
              </details>
            ))}
          </div>

          {/*
            L'assistant : une question libre, en bas des questions. Formulaire
            GET ordinaire — la réponse arrive avec la page, JavaScript ou pas.
            Voir `lib/assistant.ts` pour les deux voies (Claude, ou la page).
          */}
          <div className="mt-10">
            {/* Le titre, et à côté, en écriture manuscrite, l'invitation à demander. */}
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h3 className="titre text-2xl sm:text-3xl">{v.assistant.titre}</h3>
              <p className="manuscrit text-2xl text-vitrine-jaune sm:text-3xl">{v.assistant.sousTitre}</p>
            </div>
            <form method="get" action="/#questions" className="mt-4">
              <label htmlFor="q" className="sr-only">
                {v.assistant.placeholder}
              </label>
              <div className="flex items-center gap-2 rounded-full border-2 border-white/30 bg-white/10 p-1.5 pl-5 focus-within:border-vitrine-jaune">
                <input
                  id="q"
                  name="q"
                  type="text"
                  maxLength={200}
                  defaultValue={question}
                  placeholder={v.assistant.placeholder}
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent text-lg font-light tracking-leger text-white placeholder:text-white/50 focus:outline-none"
                />
                <button type="submit" className="bouton-pilule shrink-0">
                  {v.assistant.bouton}
                  <span className="fleche" aria-hidden="true">
                    ↑
                  </span>
                </button>
              </div>
              <p className="mt-2 text-sm font-semibold text-white/60">{v.assistant.note}</p>
            </form>

            {reponse ? (
              <div className="carte mt-4" role="status" aria-live="polite">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-vitrine-violet">
                  {v.assistant.reponse}
                </p>
                <p className="texte-leger mt-2 whitespace-pre-line text-slate-800">{reponse.texte}</p>
                {reponse.source !== 'claude' ? (
                  <p className="mt-3 text-sm font-semibold text-slate-500">
                    {reponse.source === 'limite' ? v.assistant.limite : v.assistant.depuisPage}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        {/* ------------------------------------------------- nos formateurs */}
        <Formateurs />

        {/* ----------------------------------------------------------- pied */}
        <footer className="parallaxe-apparition relative border-t border-white/15 px-5 py-8 text-center sm:px-8 lg:px-12 lg:py-12">
          <Gribouillis className="parallaxe-lent absolute right-10 top-8 hidden h-14 w-14 text-white/15 xl:block" />
          <h2 className="titre text-2xl sm:text-3xl lg:text-4xl">{v.piedTitre}</h2>
          <div className="mt-5">
            <Link href={lienInscription} className="bouton-pilule">
              {v.nav.inscription}
              <span className="fleche" aria-hidden="true">
                ↗
              </span>
            </Link>
          </div>
          <Signature />
        </footer>
      </div>

      {/* Le panneau se prolonge et se dissout dans l'hyperespace. */}
      <div
        className="panneau-violet fondu-hyperespace mx-auto max-w-5xl xl:max-w-6xl 2xl:max-w-7xl"
        aria-hidden="true"
      />

      <SectionCourante />
      <NettoyerAncre />
    </div>
  )
}
