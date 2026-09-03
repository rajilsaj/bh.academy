import { and, eq } from 'drizzle-orm'
import { Alerte, Bloc, LearnerShell, LienInvalide, Succes } from '@/components/LearnerShell'
import { db } from '@/lib/db'
import { responses } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { getLearnerByToken, getWaveByCode } from '@/lib/queries'
import { SUIVI_QUESTIONS } from '@/lib/suivi'
import { enregistrerSuivi } from './actions'

export const dynamic = 'force-dynamic'

const MESSAGES: Record<string, string> = {
  inconnue: fr.learner.suivi.vagueFermee,
  fermee: fr.learner.suivi.vagueFermee,
  pasOuverte: fr.learner.suivi.vaguePasOuverte,
  manquant: fr.inscription.champManquant,
}

export default async function SuiviPage({
  params,
  searchParams,
}: {
  params: { token: string; waveCode: string }
  searchParams: { e?: string; ok?: string }
}) {
  const learner = await getLearnerByToken(params.token)
  if (!learner) return <LienInvalide />

  const base = `/l/${learner.token}`
  const wave = await getWaveByCode(params.waveCode)
  if (!wave) return <LienInvalide />

  if (searchParams.ok === '1') {
    return (
      <LearnerShell title={fr.learner.suivi.succes} backHref={base}>
        <Bloc>
          <p className="titre text-5xl text-vitrine-vert">✓</p>
          <p className="mt-3 text-slate-700">{fr.learner.suivi.succesDetail}</p>
        </Bloc>
      </LearnerShell>
    )
  }

  const [existing] = await db
    .select({ id: responses.id })
    .from(responses)
    .where(and(eq(responses.learnerId, learner.id), eq(responses.waveId, wave.id)))
    .limit(1)

  if (existing) {
    return (
      <LearnerShell title={wave.labelFr} backHref={base}>
        <Succes>{fr.learner.suivi.dejaRepondu}</Succes>
      </LearnerShell>
    )
  }

  const now = Date.now()
  const ouverte =
    wave.opensAt !== null &&
    wave.opensAt.getTime() <= now &&
    (wave.closesAt === null || wave.closesAt.getTime() > now)

  if (!ouverte) {
    return (
      <LearnerShell title={wave.labelFr} backHref={base}>
        <Alerte>
          {wave.opensAt && wave.opensAt.getTime() > now
            ? fr.learner.suivi.vaguePasOuverte
            : fr.learner.suivi.vagueFermee}
        </Alerte>
      </LearnerShell>
    )
  }

  const erreur = searchParams.e ? MESSAGES[searchParams.e] : null

  return (
    <LearnerShell title={wave.labelFr} backHref={base}>
      {erreur ? <Alerte>{erreur}</Alerte> : null}
      <p className="mb-5 text-sm text-white/75">{fr.learner.suivi.intro}</p>

      <form action={enregistrerSuivi} className="space-y-3">
        <input type="hidden" name="token" value={learner.token} />
        <input type="hidden" name="waveCode" value={wave.code} />

        {SUIVI_QUESTIONS.map((question) => (
          <Bloc key={question.name}>
            <fieldset>
              <legend className="etiquette">
                {question.label}
                {question.required ? null : (
                  <span className="ml-1 font-normal text-slate-500">({fr.app.facultatif})</span>
                )}
              </legend>

              {question.kind === 'radio' ? (
                <div className="space-y-2">
                  {question.options.map((option) => (
                    <label key={option.value} className="option">
                      <input
                        type="radio"
                        name={question.name}
                        value={option.value}
                        required={question.required}
                        className="h-5 w-5 shrink-0 accent-vitrine-violet"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              ) : question.kind === 'number' ? (
                <input
                  type="number"
                  name={question.name}
                  min={question.min}
                  max={question.max}
                  required={question.required}
                  inputMode="numeric"
                  className="champ"
                />
              ) : (
                <input
                  type="text"
                  name={question.name}
                  maxLength={500}
                  required={question.required}
                  className="champ"
                />
              )}
            </fieldset>
          </Bloc>
        ))}

        <button type="submit" className="bouton-principal !mt-6">
          {fr.app.envoyer}
          <span className="fleche" aria-hidden="true">
            ↗
          </span>
        </button>
      </form>
    </LearnerShell>
  )
}
