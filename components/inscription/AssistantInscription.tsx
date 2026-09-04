'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { lireFormData, validerEtape, type ChampInscription, type CodeErreur, type EtapeCle } from '@/lib/inscription'

/**
 * Le formulaire d'inscription, une question à la fois.
 *
 * C'est **un seul formulaire HTML**, soumis à la server action : les
 * questions sont des écrans que le navigateur montre un par un, avec une
 * barre de progression fine en haut, « OK » ou Entrée pour avancer, et deux
 * flèches pour circuler. Avant l'hydratation — ou sans JavaScript — toutes
 * les questions s'affichent à la suite et le bouton d'envoi aussi : le
 * formulaire reste entièrement utilisable, comme toutes les pages apprenant.
 * Les écrans masqués restent dans le DOM, donc leurs valeurs partent bien
 * avec l'envoi final.
 *
 * Chaque question est validée avec le même schéma Zod que le serveur avant
 * de laisser passer. Les libellés arrivent en props : ce composant ne charge
 * pas le dictionnaire de la vitrine.
 */

export type QuestionInscription = {
  /** Le champ validé sur cet écran ; `null` pour l'écran final (consentements, récapitulatif). */
  champ: ChampInscription | null
  etape: EtapeCle
  titre: string
  aide?: string
  facultatif?: boolean
  /** Une question à choix unique passe à la suivante dès qu'on choisit. */
  choixUnique?: boolean
  contenu: ReactNode
}

export type TextesAssistant = {
  question: string
  sur: string
  ok: string
  entree: string
  entreeTexte: string
  precedent: string
  suivant: string
  envoyer: string
  facultatif: string
  recapTitre: string
  recapAide: string
  erreursTitre: string
  nonRenseigne: string
}

type Props = {
  action: (formData: FormData) => Promise<void>
  cohortId: string
  questions: QuestionInscription[]
  textes: TextesAssistant
  /** Libellé de chaque champ, pour les erreurs et le récapitulatif. */
  champs: Record<ChampInscription, string>
  /** Libellé des valeurs à choix, pour le récapitulatif. */
  options: { statut: Record<string, string>; outils: Record<string, string> }
  messages: Record<CodeErreur, string>
}

type Erreurs = Partial<Record<ChampInscription, CodeErreur>>

export function AssistantInscription({ action, cohortId, questions, textes, champs, options, messages }: Props) {
  const formulaire = useRef<HTMLFormElement>(null)
  const [hydrate, setHydrate] = useState(false)
  const [courante, setCourante] = useState(0)
  const [erreurs, setErreurs] = useState<Erreurs>({})
  const [recap, setRecap] = useState<{ champ: string; valeur: string }[]>([])

  useEffect(() => setHydrate(true), [])

  const derniere = questions.length - 1
  const q = questions[courante]

  /** Le premier champ de l'écran courant reçoit le focus : on tape sans cliquer. */
  useEffect(() => {
    if (!hydrate) return
    const ecran = formulaire.current?.querySelector<HTMLElement>(`[data-ecran="${courante}"]`)
    const champ = ecran?.querySelector<HTMLElement>('input:not([type=hidden]):not([readonly]), textarea, select')
    champ?.focus({ preventScroll: true })
    ecran?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [courante, hydrate])

  function validerCourante(fd: FormData): Erreurs {
    const resultat = validerEtape(q.etape, fd)
    if (resultat.ok) return {}
    // Seul le champ de l'écran compte ; l'écran final vérifie toute son étape.
    if (q.champ === null) return resultat.erreurs
    return q.champ in resultat.erreurs ? { [q.champ]: resultat.erreurs[q.champ] } : {}
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
    if (!formulaire.current || courante >= derniere) return
    const fd = new FormData(formulaire.current)
    const e = validerCourante(fd)
    if (Object.keys(e).length > 0) {
      setErreurs(e)
      return
    }
    setErreurs({})
    if (courante + 1 === derniere) setRecap(construireRecap(fd))
    setCourante(courante + 1)
  }

  function precedente() {
    setErreurs({})
    setCourante(Math.max(0, courante - 1))
  }

  /** Entrée avance (sauf dans une zone de texte : Ctrl+Entrée) ; les flèches circulent. */
  function clavier(e: React.KeyboardEvent<HTMLFormElement>) {
    if (!hydrate) return
    const cible = e.target as HTMLElement
    const zoneTexte = cible.tagName === 'TEXTAREA'
    if (e.key === 'Enter' && !e.shiftKey && (!zoneTexte || e.ctrlKey || e.metaKey) && cible.tagName !== 'BUTTON') {
      if (courante < derniere) {
        e.preventDefault()
        suivante()
      }
    } else if (e.key === 'ArrowDown' && !zoneTexte && cible.getAttribute('type') !== 'radio') {
      e.preventDefault()
      suivante()
    } else if (e.key === 'ArrowUp' && !zoneTexte && cible.getAttribute('type') !== 'radio') {
      e.preventDefault()
      precedente()
    }
  }

  /** Un choix unique fait avancer tout seul, le temps de voir la case se cocher. */
  function changement(e: React.ChangeEvent<HTMLFormElement>) {
    if (!hydrate || !q.choixUnique) return
    const cible = e.target as unknown as HTMLInputElement
    if (cible.type === 'radio' && cible.checked) setTimeout(suivante, 250)
  }

  /** Dernier garde-fou avant l'envoi réel : l'écran final aussi est validé. */
  function avantEnvoi(e: React.FormEvent<HTMLFormElement>) {
    if (!hydrate) return
    const resultat = validerEtape(q.etape, new FormData(e.currentTarget))
    if (!resultat.ok) {
      e.preventDefault()
      setErreurs(resultat.erreurs)
    }
  }

  const listeErreurs = (Object.entries(erreurs) as [ChampInscription, CodeErreur][]).map(([champ, code]) => ({
    champ: champs[champ],
    message: messages[code],
  }))
  const progression = Math.round((courante / questions.length) * 100)

  return (
    <form
      ref={formulaire}
      action={action}
      onSubmit={avantEnvoi}
      onKeyDown={clavier}
      onChange={changement}
      className="tf"
      noValidate={hydrate}
    >
      <input type="hidden" name="cohortId" value={cohortId} />

      {/* ------------------------------------------------ progression, en haut */}
      {hydrate ? (
        <div className="tf-progression" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progression}>
          <span style={{ width: `${progression}%` }} />
        </div>
      ) : null}

      {/* -------------------------------------------------------- questions */}
      {questions.map((question, i) => {
        const visible = !hydrate || i === courante
        return (
          <section key={i} data-ecran={i} hidden={!visible} aria-hidden={!visible} className="tf-ecran">
            <p className="tf-numero">
              {i + 1} <span aria-hidden="true">→</span>
              <span className="sr-only">
                {textes.question} {i + 1} {textes.sur} {questions.length}
              </span>
            </p>
            <div className="min-w-0 flex-1">
              <h2 className="tf-titre">
                {question.titre}
                {question.facultatif ? <span className="tf-facultatif"> {textes.facultatif}</span> : <span className="text-vitrine-jaune">*</span>}
              </h2>
              {question.aide ? <p className="tf-aide">{question.aide}</p> : null}
              <div className="mt-6">{question.contenu}</div>

              {/* Le récapitulatif, sur l'écran final. */}
              {hydrate && i === derniere && recap.length > 0 ? (
                <div className="tf-recap">
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/60">{textes.recapTitre}</p>
                  <p className="mt-1 text-lg text-white/80">{textes.recapAide}</p>
                  <dl className="mt-3 divide-y divide-white/15">
                    {recap.map((r) => (
                      <div key={r.champ} className="grid gap-0.5 py-2 sm:grid-cols-[11rem_1fr] sm:gap-3">
                        <dt className="text-lg font-semibold text-white/70">{r.champ}</dt>
                        <dd className="text-lg text-white">{r.valeur}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              {/* Les erreurs de cet écran. */}
              {hydrate && visible && listeErreurs.length > 0 ? (
                <div role="alert" className="tf-erreur">
                  {listeErreurs.map((e) => (
                    <p key={e.champ}>
                      {q.champ === null ? <strong>{e.champ} : </strong> : null}
                      {e.message}
                    </p>
                  ))}
                </div>
              ) : null}

              {/* OK, ou envoyer sur le dernier écran. */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {hydrate && i < derniere ? (
                  <>
                    <button type="button" onClick={suivante} className="tf-ok">
                      {textes.ok} <span aria-hidden="true">✓</span>
                    </button>
                    <span className="text-lg text-white/60">
                      {question.contenu && question.champ === 'objectif' ? textes.entreeTexte : textes.entree}
                    </span>
                  </>
                ) : (
                  (!hydrate && i === derniere) || (hydrate && i === derniere) ? (
                    <button type="submit" className="tf-ok">
                      {textes.envoyer} <span aria-hidden="true">↗</span>
                    </button>
                  ) : null
                )}
              </div>
            </div>
          </section>
        )
      })}

      {/* ------------------------------------------------- flèches, en bas */}
      {hydrate ? (
        <div className="tf-fleches">
          <button type="button" onClick={precedente} disabled={courante === 0} aria-label={textes.precedent}>
            ↑
          </button>
          <button type="button" onClick={suivante} disabled={courante === derniere} aria-label={textes.suivant}>
            ↓
          </button>
        </div>
      ) : null}
    </form>
  )
}
