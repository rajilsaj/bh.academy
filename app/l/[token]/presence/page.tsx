import { eq } from 'drizzle-orm'
import { Alerte, Bloc, LearnerShell, LienInvalide, Succes } from '@/components/LearnerShell'
import { db } from '@/lib/db'
import { sessions } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { formatDate } from '@/lib/format'
import { getLearnerByToken } from '@/lib/queries'
import { marquerPresence, type PresenceError } from './actions'

export const dynamic = 'force-dynamic'

const MESSAGES: Record<PresenceError, string> = {
  inconnu: fr.learner.presence.codeInconnu,
  ferme: fr.learner.presence.codeFerme,
  pasEncore: fr.learner.presence.codePasEncore,
  autreCohorte: fr.learner.presence.pasVotreCohorte,
  deja: fr.learner.presence.dejaPresent,
}

export default async function PresencePage({
  params,
  searchParams,
}: {
  params: { token: string }
  searchParams: { e?: string; ok?: string; s?: string }
}) {
  const learner = await getLearnerByToken(params.token)
  if (!learner) return <LienInvalide />

  const base = `/l/${learner.token}`
  const erreur = searchParams.e as PresenceError | undefined
  const confirme = searchParams.ok === '1'

  let seance: typeof sessions.$inferSelect | undefined
  if (searchParams.s) {
    ;[seance] = await db.select().from(sessions).where(eq(sessions.id, searchParams.s)).limit(1)
  }

  if (confirme) {
    return (
      <LearnerShell title={fr.learner.presence.succes} backHref={base}>
        <Bloc>
          <p className="titre text-5xl text-vitrine-vert">✓</p>
          <p className="mt-3 text-slate-700">
            {fr.learner.presence.succesDetail}
            {seance ? ` ${seance.moduleName} — ${formatDate(seance.heldOn)}` : ''}.
          </p>
        </Bloc>
      </LearnerShell>
    )
  }

  return (
    <LearnerShell title={fr.learner.presence.titre} backHref={base}>
      {erreur && MESSAGES[erreur] ? <Alerte>{MESSAGES[erreur]}</Alerte> : null}

      <Bloc>
        <form action={marquerPresence}>
          <input type="hidden" name="token" value={learner.token} />
          <label className="etiquette" htmlFor="code">
            {fr.learner.presence.champ}
          </label>
          <input
            id="code"
            name="code"
            className="champ text-center font-titre text-3xl font-bold uppercase tracking-[0.35em]"
            maxLength={6}
            minLength={6}
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
            pattern="[A-Za-z0-9]{6}"
          />
          <p className="mt-2 text-sm text-slate-600">{fr.learner.presence.aide}</p>
          <button type="submit" className="bouton-principal mt-6">
            {fr.learner.presence.bouton}
            <span className="fleche" aria-hidden="true">
              ↗
            </span>
          </button>
        </form>
      </Bloc>
    </LearnerShell>
  )
}
