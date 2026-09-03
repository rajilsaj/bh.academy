'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ETAPES,
  lireFormData,
  validerEtape,
  type ChampInscription,
  type CodeErreur,
  type EtapeCle,
} from '@/lib/inscription'

/**
 * Le formulaire d'inscription en trois étapes.
 *
 * C'est **un seul formulaire HTML**, soumis à la server action : les étapes
 * sont des panneaux que le navigateur montre un par un. Avant l'hydratation
 * — ou sans JavaScript — les trois panneaux sont visibles et le bouton
 * d'envoi aussi : le formulaire reste entièrement utilisable, comme toutes
 * les pages apprenant. Les panneaux masqués restent dans le DOM, donc leurs
 * valeurs partent bien avec l'envoi final.
 *
 * Chaque étape est validée avec le même schéma Zod que le serveur avant de
 * laisser passer. Les libellés arrivent en props : ce composant ne charge pas
 * le dictionnaire de la vitrine.
 */

export type EtapeInscription = { cle: EtapeCle; titre: string; contenu: ReactNode }

export type TextesAssistant = {
  etape: string
  sur: string
  precedent: string
  suivant: string
  envoyer: string
  recapTitre: string
  recapAide: string
  erreursTitre: string
  nonRenseigne: string
}

type Props = {
  action: (formData: FormData) => Promise<void>
  cohortId: string
  etapes: EtapeInscription[]
  textes: TextesAssistant
  /** Libellé de chaque champ, pour les erreurs et le récapitulatif. */
  champs: Record<ChampInscription, string>
  /** Libellé des valeurs à choix, pour le récapitulatif. */
  options: { statut: Record<string, string>; outils: Record<string, string> }
  messages: Record<CodeErreur, string>
}

type Erreurs = Partial<Record<ChampInscription, CodeErreur>>

export function AssistantInscription({ action, cohortId, etapes, textes, champs, options, messages }: Props) {
  const formulaire = useRef<HTMLFormElement>(null)
  const [hydrate, setHydrate] = useState(false)
  const [courante, setCourante] = useState(0)
  const [erreurs, setErreurs] = useState<Erreurs>({})
  const [recap, setRecap] = useState<{ champ: string; valeur: string }[]>([])

  useEffect(() => setHydrate(true), [])

  const derniere = etapes.length - 1
  const cle = etapes[courante]?.cle ?? ETAPES[0]

  function focaliserPremiereErreur(e: Erreurs) {
    const premier = Object.keys(e)[0]
    const element = formulaire.current?.elements.namedItem(premier)
    const cible = element instanceof RadioNodeList ? element.item(0) : element
    if (cible instanceof HTMLElement) cible.focus()
  }

  function construireRecap(fd: FormData) {
    const v = lireFormData(fd)
    const ou = (s: string) => (s ? s : textes.nonRenseigne)
    return [
      { champ: champs.fullName, valeur: ou(v.fullName.trim()) },
      { champ: champs.phone, valeur: ou(v.phone.trim()) },
      { champ: champs.email, valeur: ou(v.email.trim()) },
      { champ: champs.statut, valeur: ou(options.statut[v.statut] ?? '') },
      { champ: champs.outils, valeur: ou(v.outils.map((o) => options.outils[o] ?? o).join(', ')) },
      { champ: champs.confiance, valeur: ou(v.confiance ? `${v.confiance} / 5` : '') },
      { champ: champs.objectif, valeur: ou(v.objectif.trim()) },
    ]
  }

  function suivante() {
    if (!formulaire.current) return
    const fd = new FormData(formulaire.current)
    const resultat = validerEtape(cle, fd)
    if (!resultat.ok) {
      setErreurs(resultat.erreurs)
      focaliserPremiereErreur(resultat.erreurs)
      return
    }
    setErreurs({})
    if (courante + 1 === derniere) setRecap(construireRecap(fd))
    setCourante(courante + 1)
    formulaire.current.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  function precedente() {
    setErreurs({})
    setCourante(Math.max(0, courante - 1))
    formulaire.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  /** Dernier garde-fou avant l'envoi réel : la dernière étape aussi est validée. */
  function avantEnvoi(e: React.FormEvent<HTMLFormElement>) {
    if (!hydrate) return
    const resultat = validerEtape(cle, new FormData(e.currentTarget))
    if (!resultat.ok) {
      e.preventDefault()
      setErreurs(resultat.erreurs)
      focaliserPremiereErreur(resultat.erreurs)
    }
  }

  const listeErreurs = (Object.entries(erreurs) as [ChampInscription, CodeErreur][]).map(([champ, code]) => ({
    champ: champs[champ],
    message: messages[code],
  }))

  return (
    <form ref={formulaire} action={action} onSubmit={avantEnvoi} className="space-y-3" noValidate={hydrate}>
      <input type="hidden" name="cohortId" value={cohortId} />

      {/* ------------------------------------------------ barre de progression */}
      {hydrate ? (
        <ol className="mb-5 flex items-center gap-2" aria-label={`${textes.etape} ${courante + 1} ${textes.sur} ${etapes.length}`}>
          {etapes.map((e, i) => {
            const faite = i < courante
            const active = i === courante
            return (
              <li key={e.cle} className="flex min-w-0 flex-1 items-center gap-2">
                <span
                  aria-current={active ? 'step' : undefined}
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors ${
                    faite
                      ? 'bg-vitrine-jaune text-vitrine-violet-fonce'
                      : active
                        ? 'bg-white text-vitrine-violet-fonce ring-4 ring-white/30'
                        : 'bg-white/20 text-white'
                  }`}
                >
                  {faite ? '✓' : i + 1}
                </span>
                <span className={`truncate text-sm font-semibold ${active ? 'text-white' : 'hidden text-white/60 sm:inline'}`}>
                  {e.titre}
                </span>
                {i < derniere ? <span className={`h-1 flex-1 rounded-full ${faite ? 'bg-vitrine-jaune' : 'bg-white/20'}`} /> : null}
              </li>
            )
          })}
        </ol>
      ) : null}

      {/* ---------------------------------------------------------- étapes */}
      {etapes.map((e, i) => {
        const visible = !hydrate || i === courante
        return (
          <section key={e.cle} hidden={!visible} aria-hidden={!visible} className="space-y-3">
            {/* Le titre « Étape n sur 3 » est rendu ici : un seul endroit pour les deux modes. */}
            {e.contenu}
          </section>
        )
      })}

      {/* -------------------------------------------- récapitulatif (étape 3) */}
      {hydrate && courante === derniere && recap.length > 0 ? (
        <div className="carte">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-vitrine-violet">{textes.recapTitre}</p>
          <p className="mt-1 text-sm text-slate-500">{textes.recapAide}</p>
          <dl className="mt-3 divide-y divide-slate-200">
            {recap.map((r) => (
              <div key={r.champ} className="grid gap-0.5 py-2 sm:grid-cols-[10rem_1fr] sm:gap-3">
                <dt className="text-sm font-semibold text-slate-700">{r.champ}</dt>
                <dd className="text-sm text-slate-900">{r.valeur}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {/* ---------------------------------------------------------- erreurs */}
      {listeErreurs.length > 0 ? (
        <div role="alert" className="rounded-bloc border-2 border-vitrine-rose bg-white p-3 text-sm text-slate-900">
          <p className="font-semibold text-vitrine-rose">{textes.erreursTitre}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {listeErreurs.map((e) => (
              <li key={e.champ}>
                <span className="font-semibold">{e.champ}</span> : {e.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ------------------------------------------------------- navigation */}
      <div className="!mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {hydrate && courante > 0 ? (
          <button type="button" onClick={precedente} className="bouton-fantome justify-center">
            ← {textes.precedent}
          </button>
        ) : (
          <span />
        )}
        {hydrate && courante < derniere ? (
          <button type="button" onClick={suivante} className="bouton-principal sm:w-auto">
            {textes.suivant}
            <span className="fleche" aria-hidden="true">
              →
            </span>
          </button>
        ) : (
          <button type="submit" className="bouton-principal sm:w-auto">
            {textes.envoyer}
            <span className="fleche" aria-hidden="true">
              ↗
            </span>
          </button>
        )}
      </div>
    </form>
  )
}
