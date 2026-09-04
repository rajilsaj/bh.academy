import { fr } from '@/lib/i18n/fr'
import { getFormateursPublics, initiales, type FormateurPublic } from '@/lib/formateurs'
import { modeEconomie } from '@/lib/economie'

const v = fr.vitrine

/** Petites marques des réseaux, en trait, sans image externe. */
function IconeLinkedin() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  )
}

function IconeFacebook() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.88v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07Z" />
    </svg>
  )
}

function IconeSite() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  )
}

/** La première phrase de la présentation, jamais plus de ~90 caractères. */
function resume(bio: string | null): string | null {
  if (!bio) return null
  const premiere = bio.split(/(?<=[.!?])\s/)[0] ?? bio
  return premiere.length > 90 ? `${premiere.slice(0, 87).trimEnd()}…` : premiere
}

function Carte({ f, eco }: { f: FormateurPublic; eco: boolean }) {
  const liens = [
    f.linkedin ? { href: f.linkedin, label: v.formateurs.linkedin, icone: <IconeLinkedin /> } : null,
    f.facebook ? { href: f.facebook, label: v.formateurs.facebook, icone: <IconeFacebook /> } : null,
    f.website ? { href: f.website, label: v.formateurs.site, icone: <IconeSite /> } : null,
    f.linktree ? { href: f.linktree, label: v.formateurs.linktree, icone: <IconeSite /> } : null,
  ].filter((l): l is NonNullable<typeof l> => l !== null)
  const texte = resume(f.bio)

  return (
    <article className="carte-violette flex w-64 shrink-0 flex-col items-center px-5 py-6 text-center">
      {/* Le portrait, grand ; ou les initiales sur un disque jaune. */}
      {f.aPhoto && !eco ? (
        <img
          src={`/api/formateurs/${f.id}/photo`}
          alt={f.nom}
          width={144}
          height={144}
          loading="lazy"
          decoding="async"
          className="h-36 w-36 rounded-full object-cover ring-4 ring-white/25"
        />
      ) : (
        <span
          aria-hidden
          className="titre grid h-36 w-36 place-items-center rounded-full bg-vitrine-jaune text-5xl text-vitrine-violet-fonce ring-4 ring-white/25"
        >
          {initiales(f.nom)}
        </span>
      )}

      <h3 className="titre mt-4 text-balance text-xl leading-tight">{f.nom}</h3>
      {f.modules.length > 0 ? <p className="mt-1 text-lg font-semibold text-vitrine-jaune">{f.modules[0]}</p> : null}
      {texte ? <p className="texte-leger mt-2 line-clamp-2 text-lg leading-snug text-white">{texte}</p> : null}

      {liens.length > 0 ? (
        <p className="mt-auto flex gap-2 pt-4">
          {liens.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${l.label} — ${f.nom}`}
              title={l.label}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/30 text-white transition-colors hover:bg-white hover:text-vitrine-violet-fonce"
            >
              {l.icone}
            </a>
          ))}
        </p>
      ) : null}
    </article>
  )
}

/**
 * « Nos experts », en défilement continu de gauche à droite, qui s'arrête au
 * survol (voir `.defilement-*` dans globals.css). Aucun JavaScript : la piste
 * est doublée pour boucler sans couture. Sans formateur — ou si la base ne
 * répond pas — la section disparaît, la page reste entière.
 */
export async function Formateurs() {
  let liste: FormateurPublic[]
  try {
    liste = await getFormateursPublics()
  } catch (erreur) {
    console.error('[vitrine] formateurs :', erreur)
    return null
  }
  if (liste.length === 0) return null
  const eco = modeEconomie()
  // Environ six secondes par carte : lisible, jamais frénétique.
  const duree = `${Math.max(24, liste.length * 6)}s`

  return (
    <section id="formateurs" className="parallaxe-apparition pb-12 lg:pb-16">
      <div className="px-5 sm:px-8 lg:px-12">
        <h2 className="titre text-balance text-3xl sm:text-4xl lg:text-5xl">
          {v.formateurs.titre} <span className="manuscrit text-vitrine-jaune">{v.formateurs.manuscrit}</span>
        </h2>
        <p className="texte-leger mt-3 max-w-2xl text-pretty text-white">{v.formateurs.sousTitre}</p>
      </div>

      <div className="defilement-cadre mt-6 lg:mt-8">
        <ul className="defilement-piste" style={{ animationDuration: duree }}>
          {[...liste, ...liste].map((f, i) => (
            <li key={`${f.id}-${i}`} aria-hidden={i >= liste.length ? true : undefined}>
              <Carte f={f} eco={eco} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
