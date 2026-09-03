import { AccesRefuse, NiveauBadge } from '@/components/AccesRefuse'
import { AlerteSombre, SuccesSombre } from '@/components/AccesRefuse'
import { can, requirePermission } from '@/lib/auth'
import { learnerLink } from '@/lib/config'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { KIT_ITEMS, learnerKit, OUTCOME_TYPES } from '@/lib/db/schema'
import { completionApprenant, pointsParModule } from '@/lib/points'
import { fr } from '@/lib/i18n/fr'
import { LEVEL_CLASS, formatDate, formatDateTime, formatPercent, levelLabel } from '@/lib/format'
import { getLearnerDossier } from '@/lib/queries'
import { ajouterResultat, enregistrerKit } from './actions'

export const dynamic = 'force-dynamic'

/** Rend lisible un `payload` jsonb de réponse sans imposer de schéma figé. */
function lignesPayload(payload: Record<string, unknown>) {
  return Object.entries(payload).map(([key, value]) => ({
    key,
    value: Array.isArray(value) ? value.join(', ') : String(value),
  }))
}

export default async function LearnerPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { e?: string; ok?: string }
}) {
  const session = await requirePermission('voirApprenants')
  if (!session) return <AccesRefuse />

  const dossier = await getLearnerDossier(decodeURIComponent(params.id))
  if (!dossier) return <p className="bo-panneau">{fr.admin.learner.introuvable}</p>

  const { learner, cohort, presences, attempts, documents, outcomes } = dossier
  const [kit, pointsModules, completion] = await Promise.all([
    db.select({ item: learnerKit.item }).from(learnerKit).where(eq(learnerKit.learnerId, learner.id)),
    pointsParModule(undefined, learner.id),
    completionApprenant(learner.id),
  ])
  const kitRemis = new Set(kit.map((k) => k.item))
  const peutGererKit = can(session.user.role, 'gererSessions')
  const voitCoordonnees = can(session.user.role, 'voirCoordonnees')
  const peutAjouterResultat = can(session.user.role, 'gererResultats')
  const baseline = dossier.responses.find((r) => r.waveCode === 'J0')
  const suivis = dossier.responses.filter((r) => r.waveCode !== 'J0')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">{learner.fullName}</h1>
        <p className="text-sm text-bo-doux">
          {learner.id} — {cohort?.name}
        </p>
      </div>

      {searchParams.ok === 'kit' ? <SuccesSombre>{fr.admin.learner.kitEnregistre}</SuccesSombre> : null}
      {searchParams.ok && searchParams.ok !== 'kit' ? <SuccesSombre>{fr.admin.learner.resultatAjoute}</SuccesSombre> : null}
      {searchParams.e ? <AlerteSombre>{fr.inscription.champManquant}</AlerteSombre> : null}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="bo-panneau">
          <h2 className="mb-2 font-semibold">{fr.admin.learner.identite}</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="w-40 text-bo-doux">{fr.admin.learner.identifiant}</dt>
              <dd>{learner.id}</dd>
            </div>
            {voitCoordonnees ? (
              <>
                <div className="flex gap-2">
                  <dt className="w-40 text-bo-doux">{fr.inscription.telephone}</dt>
                  <dd>{learner.phone ?? '—'}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-40 text-bo-doux">{fr.inscription.email}</dt>
                  <dd className="break-all">{learner.email ?? '—'}</dd>
                </div>
              </>
            ) : null}
            <div className="flex gap-2">
              <dt className="w-40 text-bo-doux">{fr.admin.learner.inscritLe}</dt>
              <dd>{formatDateTime(learner.createdAt)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-40 text-bo-doux">{fr.inscription.consentCommunaute}</dt>
              <dd>{learner.consentCommunity ? fr.app.oui : fr.app.non}</dd>
            </div>
          </dl>
          {voitCoordonnees ? (
            <p className="mt-3 break-all text-xs text-bo-doux">
              {fr.admin.learner.lienPersonnel} : {learnerLink(learner.token)}
            </p>
          ) : null}
        </div>

        <div className="bo-panneau">
          <h2 className="mb-2 font-semibold">{fr.admin.learner.niveauCalcule}</h2>
          {dossier.level ? (
            <NiveauBadge
              level={levelLabel(dossier.level)}
              className={LEVEL_CLASS[dossier.level]}
            />
          ) : null}
          <p className="mt-2 text-sm text-bo-doux">
            {fr.admin.dashboard.tauxPresence} : {formatPercent(dossier.attendanceRate)}
          </p>
          <p className="mt-2 text-xs text-bo-doux">{fr.admin.learner.niveauAide}</p>
        </div>
      </section>

      {/* ---------------------------------------- points et kit remis */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="bo-panneau">
          <h2 className="mb-2 font-semibold">{fr.admin.learner.pointsTitre}</h2>
          {pointsModules.length === 0 ? (
            <p className="text-sm text-bo-doux">{fr.admin.points.aucuneFormation} {fr.admin.nav.formations}.</p>
          ) : (
            <>
              <p className="mb-2 text-sm">
                {fr.admin.learner.completion} :{' '}
                <strong className="text-bo-menthe">{formatPercent(completion?.completion ?? 0)}</strong>
                <span className="bo-doux"> — {completion?.points_acquis ?? 0}/{completion?.points_total ?? 0}</span>
              </p>
              <table className="bo-tableau">
                <tbody>
                  {pointsModules.map((m) => (
                    <tr key={m.module_id}>
                      <td>{m.position}. {m.title}</td>
                      <td className="tabular-nums">{m.points_acquis}/{m.points_total}</td>
                      <td className="tabular-nums">{formatPercent(m.pct)}</td>
                      <td className="text-right">{fr.admin.points.statuts[m.statut]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
        <div className="bo-panneau">
          <h2 className="mb-2 font-semibold">{fr.admin.learner.kit}</h2>
          <p className="bo-doux mb-3">{fr.admin.learner.kitAide}</p>
          <form action={enregistrerKit} className="space-y-2">
            <input type="hidden" name="learnerId" value={learner.id} />
            {KIT_ITEMS.map((item) => (
              <label key={item} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="item" value={item} defaultChecked={kitRemis.has(item)} disabled={!peutGererKit} className="h-4 w-4 accent-bo-menthe" />
                {fr.kit[item]}
              </label>
            ))}
            {peutGererKit ? (
              <button type="submit" className="bo-bouton-discret mt-2">{fr.app.enregistrer}</button>
            ) : null}
          </form>
        </div>
      </section>

      {baseline ? (
        <section className="bo-panneau">
          <h2 className="mb-2 font-semibold">{fr.admin.learner.baseline}</h2>
          <dl className="grid gap-1 text-sm sm:grid-cols-2">
            {lignesPayload(baseline.payload).map((row) => (
              <div key={row.key} className="flex gap-2">
                <dt className="w-40 shrink-0 text-bo-doux">{row.key}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="bo-panneau">
          <h2 className="mb-2 font-semibold">{fr.admin.learner.presences}</h2>
          <div className="overflow-x-auto">
            <table className="bo-tableau">
              <tbody>
                {presences.map((row) => (
                  <tr key={row.sessionId}>
                    <td>{row.moduleName}</td>
                    <td className="whitespace-nowrap">{formatDate(row.heldOn)}</td>
                    <td className="text-right">{row.checkedInAt ? fr.app.oui : fr.app.non}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bo-panneau">
          <h2 className="mb-2 font-semibold">{fr.admin.learner.quiz}</h2>
          {attempts.length === 0 ? (
            <p className="text-sm text-bo-doux">{fr.app.aucuneDonnee}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="bo-tableau">
                <tbody>
                  {attempts.map((row) => (
                    <tr key={row.id}>
                      <td>{row.title}</td>
                      <td className="whitespace-nowrap">{formatDate(row.submittedAt)}</td>
                      <td className="text-right font-semibold">
                        {row.score}/{row.maxScore}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="bo-panneau">
        <h2 className="mb-2 font-semibold">{fr.admin.learner.reponses}</h2>
        {suivis.length === 0 ? (
          <p className="text-sm text-bo-doux">{fr.app.aucuneDonnee}</p>
        ) : (
          <div className="space-y-3">
            {suivis.map((row) => (
              <details key={row.id} className="rounded border border-bo-bordure p-2">
                <summary className="cursor-pointer text-sm font-medium">
                  {row.waveLabel} — {formatDate(row.submittedAt)}
                </summary>
                <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                  {lignesPayload(row.payload).map((cell) => (
                    <div key={cell.key} className="flex gap-2">
                      <dt className="w-40 shrink-0 text-bo-doux">{cell.key}</dt>
                      <dd>{cell.value}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            ))}
          </div>
        )}
      </section>

      <section className="bo-panneau">
        <h2 className="mb-2 font-semibold">{fr.admin.learner.documents}</h2>
        {documents.length === 0 ? (
          <p className="text-sm text-bo-doux">{fr.app.aucuneDonnee}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="bo-tableau">
              <thead>
                <tr>
                  <th>{fr.app.type}</th>
                  <th>{fr.learner.documents.version}</th>
                  <th>{fr.app.date}</th>
                  <th>{fr.app.action}</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>{fr.docTypes[doc.docType]}</td>
                    <td>{doc.version}</td>
                    <td className="whitespace-nowrap">{formatDateTime(doc.uploadedAt)}</td>
                    <td>
                      <a href={`/api/fichiers/${doc.id}`} className="underline">
                        {fr.admin.learner.telecharger}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bo-panneau">
        <h2 className="mb-2 font-semibold">{fr.admin.learner.resultats}</h2>
        {outcomes.length === 0 ? (
          <p className="text-sm text-bo-doux">{fr.app.aucuneDonnee}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="bo-tableau">
              <thead>
                <tr>
                  <th>{fr.app.type}</th>
                  <th>{fr.admin.learner.survenuLe}</th>
                  <th>{fr.app.detail}</th>
                </tr>
              </thead>
              <tbody>
                {outcomes.map((row) => (
                  <tr key={row.id}>
                    <td>{fr.outcomeTypes[row.outcomeType]}</td>
                    <td className="whitespace-nowrap">{formatDate(row.occurredOn)}</td>
                    <td>{row.detail ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {peutAjouterResultat ? (
          <form action={ajouterResultat} className="mt-4 grid gap-3 sm:grid-cols-4">
            <input type="hidden" name="learnerId" value={learner.id} />
            <div>
              <label className="bo-doux mb-1 block" htmlFor="outcomeType">
                {fr.app.type}
              </label>
              <select id="outcomeType" name="outcomeType" required className="bo-champ">
                {OUTCOME_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {fr.outcomeTypes[type]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="bo-doux mb-1 block" htmlFor="occurredOn">
                {fr.admin.learner.survenuLe}
              </label>
              <input id="occurredOn" name="occurredOn" type="date" required className="bo-champ" />
            </div>
            <div className="sm:col-span-2">
              <label className="bo-doux mb-1 block" htmlFor="detail">
                {fr.app.detail}
              </label>
              <input id="detail" name="detail" maxLength={300} className="bo-champ" />
            </div>
            <div className="sm:col-span-4">
              <button type="submit" className="bo-bouton-discret">
                {fr.admin.learner.ajouterResultat}
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </div>
  )
}
