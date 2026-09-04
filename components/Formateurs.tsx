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

function Carte({ f, eco }: { f: FormateurPublic; eco: boolean }) {
  const liens = [
    f.linkedin ? { href: f.linkedin, label: v.formateurs.linkedin, icone: <IconeLinkedin /> } : null,
    f.facebook ? { href: f.facebook, label: v.formateurs.facebook, icone: <IconeFacebook /> } : null,
    f.website ? { href: f.website, label: v.formateurs.site, icone: <IconeSite /> } : null,
    f.linktree ? { href: f.linktree, label: v.formateurs.linktree, icone: <IconeSite /> } : null,
  ].filter((l): l is NonNullable<typeof l> => l !== null)

  return (
    <article className="carte-violette flex gap-4 lg:p-6">
      {/* Le portrait, ou les initiales sur un disque jaune s'il n'y en a pas encore. */}
      {f.aPhoto && !eco ? (
        <img
          src={`/api/formateurs/${f.id}/photo`}
          alt={f.nom}
          width={96}
          height={96}
          loading="lazy"
          decoding="async"
          className="h-20 w-20 shrink-0 rounded-full object-cover ring-4 ring-white/20 sm:h-24 sm:w-24"
        />
      ) : (
        <span
          aria-hidden
          className="titre grid h-20 w-20 shrink-0 place-items-center rounded-full bg-vitrine-jaune text-3xl text-vitrine-violet-fonce ring-4 ring-white/20 sm:h-24 sm:w-24"
        >
          {initiales(f.nom)}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <h3 className="titre text-xl leading-tight lg:text-2xl">{f.nom}</h3>
        {f.modules.length > 0 ? (
          <p className="mt-1 text-lg font-semibold text-vitrine-jaune">{f.modules.join(' · ')}</p>
        ) : null}
        {f.bio ? <p className="texte-leger mt-2 text-lg text-pretty leading-snug text-white">{f.bio}</p> : null}
        {liens.length > 0 ? (
          <p className="mt-3 flex flex-wrap gap-2">
            {liens.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/30 px-3 py-1 text-sm font-bold text-white transition-colors hover:bg-white hover:text-vitrine-violet-fonce"
              >
                {l.icone}
                {l.label}
              </a>
            ))}
          </p>
        ) : null}
      </div>
    </article>
  )
}

/**
 * « Nos formateurs » : lu en base à chaque affichage. Sans formateur — ou si
 * la base ne répond pas — la section disparaît, la page reste entière.
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

  return (
    <section id="formateurs" className="parallaxe-apparition px-5 pb-12 sm:px-8 lg:px-12 lg:pb-16">
      <h2 className="titre text-balance text-3xl sm:text-4xl lg:text-5xl">
        {v.formateurs.titre} <span className="manuscrit text-vitrine-jaune">{v.formateurs.manuscrit}</span>
      </h2>
      <p className="texte-leger mt-3 max-w-2xl text-pretty text-white">{v.formateurs.sousTitre}</p>

      <div className="mt-6 grid gap-3 md:grid-cols-2 lg:mt-8 lg:gap-5">
        {liste.map((f) => (
          <Carte key={f.id} f={f} eco={eco} />
        ))}
      </div>
    </section>
  )
}
