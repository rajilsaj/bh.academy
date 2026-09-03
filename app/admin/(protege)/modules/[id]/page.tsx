import Link from 'next/link'
import { asc, eq, sql as raw } from 'drizzle-orm'
import { AccesRefuse, AlerteSombre, SuccesSombre } from '@/components/AccesRefuse'
import { BarreSelection, EnTete } from '@/components/admin/Cockpit'
import { can, requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { cohorts, programModules, programs, resources, staff, trainerProfiles } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { formatDate } from '@/lib/format'
import {
  ajouterModule,
  attribuerFormateurs,
  detacherPromotion,
  enregistrerObjectifs,
  genererObjectifsFormation,
  modifierFormation,
  modifierModule,
  rattacherPromotion,
  supprimerFormation,
  supprimerModule,
} from '../actions'

export const dynamic = 'force-dynamic'

const t = fr.admin.formations

/** Champ numérique compact d'une ligne de module. */
function Nombre({ nom, valeur, min = 0, max, label }: { nom: string; valeur: number | string; min?: number; max?: number; label: string }) {
  return (
    <input
      name={nom}
      type="number"
      min={min}
      max={max}
      step={nom === 'durationHours' ? 0.5 : 1}
      defaultValue={valeur}
      aria-label={label}
      className="bo-champ !w-20 !px-2 !py-1 tabular-nums"
    />
  )
}

/**
 * La fiche d'une formation. L'administrateur y modifie tout ; le formateur la
 * consulte en lecture, et rejoint les ressources de ses modules d'un clic.
 */
export default async function FormationPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { ok?: string; e?: string; n?: string; supprimer?: string }
}) {
  const session = await requirePermission('voirModules')
  if (!session) return <AccesRefuse />
  const peutModifier = can(session.user.role, 'gererFormations')

  const [formation] = await db.select().from(programs).where(eq(programs.id, params.id)).limit(1)
  if (!formation) return <p className="bo-panneau">{fr.app.aucuneDonnee}</p>

  const [modules, formateurs, promotions, ressourcesParModule] = await Promise.all([
    db
      .select({
        m: programModules,
        formateur: trainerProfiles.fullName,
        formateurEmail: staff.email,
      })
      .from(programModules)
      .leftJoin(staff, eq(staff.id, programModules.trainerId))
      .leftJoin(trainerProfiles, eq(trainerProfiles.staffId, staff.id))
      .where(eq(programModules.programId, formation.id))
      .orderBy(asc(programModules.position)),
    db
      .select({ id: staff.id, email: staff.email, nom: trainerProfiles.fullName })
      .from(staff)
      .leftJoin(trainerProfiles, eq(trainerProfiles.staffId, staff.id))
      .where(eq(staff.role, 'formateur'))
      .orderBy(asc(trainerProfiles.fullName)),
    db.select().from(cohorts).orderBy(asc(cohorts.startsOn)),
    db
      .select({ moduleId: resources.moduleId, n: raw<number>`count(*)::int` })
      .from(resources)
      .groupBy(resources.moduleId),
  ])
  const nbRessources = new Map(ressourcesParModule.map((r) => [r.moduleId, r.n]))
  const sommePoids = modules.reduce((n, r) => n + r.m.weight, 0)
  const rattachees = promotions.filter((p) => p.programId === formation.id)
  const libres = promotions.filter((p) => p.programId !== formation.id)

  const messageOk = searchParams.ok ? (t.messages[searchParams.ok as keyof typeof t.messages] ?? '').replace('{n}', searchParams.n ?? '') : null
  const messageErreur = searchParams.e ? t.messages[searchParams.e as keyof typeof t.messages] : null

  return (
    <div className="space-y-6">
      <EnTete
        retour={{ href: '/admin/modules', label: t.titre }}
        titre={formation.name}
        sousTitre={`${formation.startsOn ? formatDate(formation.startsOn) : '—'} → ${formation.endsOn ? formatDate(formation.endsOn) : '—'}${formation.schedule ? ` · ${formation.schedule}` : ''}`}
        actions={peutModifier ? <Link href="/admin/sessions" className="bo-bouton-discret">{fr.admin.tableau.planifier}</Link> : null}
      />
      {messageOk ? <SuccesSombre>{messageOk}</SuccesSombre> : null}
      {messageErreur ? <AlerteSombre>{messageErreur}</AlerteSombre> : null}
      {!peutModifier ? <p className="bo-doux">{t.lectureSeule}</p> : null}

      {/* ------------------------------------------- fiche + objectifs */}
      {peutModifier ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <form action={modifierFormation} className="bo-panneau grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="programId" value={formation.id} />
            <div className="sm:col-span-2">
              <label className="bo-doux mb-1 block" htmlFor="name">{t.nom}</label>
              <input id="name" name="name" required maxLength={200} defaultValue={formation.name} className="bo-champ" />
            </div>
            <div className="sm:col-span-2">
              <label className="bo-doux mb-1 block" htmlFor="description">{t.description}</label>
              <textarea id="description" name="description" rows={3} maxLength={2000} defaultValue={formation.description ?? ''} className="bo-champ" />
            </div>
            <div>
              <label className="bo-doux mb-1 block" htmlFor="startsOn">{t.debut}</label>
              <input id="startsOn" name="startsOn" type="date" defaultValue={formation.startsOn ?? ''} className="bo-champ" />
            </div>
            <div>
              <label className="bo-doux mb-1 block" htmlFor="endsOn">{t.fin}</label>
              <input id="endsOn" name="endsOn" type="date" defaultValue={formation.endsOn ?? ''} className="bo-champ" />
            </div>
            <div>
              <label className="bo-doux mb-1 block" htmlFor="schedule">{t.horaires}</label>
              <input id="schedule" name="schedule" maxLength={200} defaultValue={formation.schedule ?? ''} className="bo-champ" />
            </div>
            <div>
              <label className="bo-doux mb-1 block" htmlFor="expectedLearners">{t.apprenantsAttendus}</label>
              <input id="expectedLearners" name="expectedLearners" type="number" min={0} defaultValue={formation.expectedLearners ?? ''} className="bo-champ" />
            </div>
            <div className="sm:col-span-2">
              <label className="bo-doux mb-1 block" htmlFor="partner">{t.partenaire}</label>
              <input id="partner" name="partner" maxLength={200} defaultValue={formation.partner ?? ''} className="bo-champ" />
            </div>
            <div className="sm:col-span-2">
              <label className="bo-doux mb-1 block" htmlFor="expectations">{t.attentes}</label>
              <textarea id="expectations" name="expectations" rows={3} maxLength={2000} defaultValue={formation.expectations ?? ''} className="bo-champ" />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
              <button type="submit" className="bo-bouton">{fr.app.enregistrer}</button>
            </div>
          </form>

          <div className="bo-panneau">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">{t.objectifs}</h2>
              <form action={genererObjectifsFormation}>
                <input type="hidden" name="programId" value={formation.id} />
                <button type="submit" className="bo-bouton-discret">✦ {t.genererIA}</button>
              </form>
            </div>
            <p className="bo-doux mb-3">{t.objectifsAide}</p>
            {formation.goalChecklist.length > 0 ? (
              <ul className="mb-3 space-y-1.5">
                {formation.goalChecklist.map((o, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border border-bo-menthe/60 text-[10px] text-bo-menthe">✓</span>
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <form action={enregistrerObjectifs} className="space-y-2">
              <input type="hidden" name="programId" value={formation.id} />
              <textarea name="objectifs" rows={6} defaultValue={formation.goalChecklist.join('\n')} className="bo-champ font-mono !text-xs" />
              <button type="submit" className="bo-bouton-discret">{t.enregistrerObjectifs}</button>
            </form>
          </div>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="bo-panneau space-y-2 text-sm">
            {formation.description ? <p>{formation.description}</p> : null}
            <p className="bo-doux">
              {t.apprenantsAttendus} : <strong className="text-bo-texte">{formation.expectedLearners ?? '—'}</strong>
              {formation.partner ? ` · ${t.partenaire} : ${formation.partner}` : ''}
            </p>
            {formation.expectations ? <p className="bo-doux">{formation.expectations}</p> : null}
          </div>
          <div className="bo-panneau">
            <h2 className="mb-2 font-semibold">{t.objectifs}</h2>
            {formation.goalChecklist.length > 0 ? (
              <ul className="space-y-1.5">
                {formation.goalChecklist.map((o, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border border-bo-menthe/60 text-[10px] text-bo-menthe">✓</span>
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="bo-doux">{fr.app.aucuneDonnee}</p>
            )}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------ modules */}
      <section className="bo-panneau group/selection">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">{t.modules}</h2>
          <p className="bo-doux">
            {t.sommePoids} <strong className="text-bo-texte">{sommePoids}</strong>
          </p>
        </div>
        <p className="bo-doux mb-3">{t.completionAide}</p>
        {peutModifier ? (
          <div className="mb-3">
            <BarreSelection formId="attribution">
              <input type="hidden" name="programId" value={formation.id} />
              <span className="text-sm font-semibold">{t.selectionModules}</span>
              <label className="flex items-center gap-2 text-sm">
                {t.attribuerA}
                <select name="trainerId" className="bo-champ !w-auto !py-1" aria-label={t.formateur}>
                  <option value="">{t.sansFormateur}</option>
                  {formateurs.map((f) => (
                    <option key={f.id} value={f.id}>{f.nom ?? f.email}</option>
                  ))}
                </select>
              </label>
              <button formAction={attribuerFormateurs} type="submit" className="bo-bouton-discret">{t.attribuer}</button>
            </BarreSelection>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="bo-tableau">
            <thead>
              <tr>
                {peutModifier ? <th className="w-8"><span className="sr-only">{t.selectionModules}</span></th> : null}
                <th>{t.position}</th>
                <th>{t.titreModule}</th>
                <th>{t.duree}</th>
                <th>{t.pointsTotal}</th>
                <th>{t.pointsPresence}</th>
                <th>{t.pointsRessource}</th>
                <th>{t.pointsQuiz}</th>
                <th>{t.poids}</th>
                <th>{t.seuil}</th>
                <th>{t.formateur}</th>
                <th>{t.ressources}</th>
                {peutModifier ? <th>{fr.app.action}</th> : null}
              </tr>
            </thead>
            <tbody>
              {modules.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-bo-doux">{fr.app.aucuneDonnee}</td>
                </tr>
              ) : null}
              {modules.map(({ m, formateur, formateurEmail }) => {
                const idForm = `module-${m.id}`
                const lienRessources = (
                  <Link href={`/admin/ressources?module=${m.id}`} className="underline">
                    {nbRessources.get(m.id) ?? 0}
                  </Link>
                )
                if (!peutModifier) {
                  return (
                    <tr key={m.id}>
                      <td className="tabular-nums">{m.position}</td>
                      <td className="min-w-56">
                        <span className="font-medium">{m.title}</span>
                        {m.description ? <span className="bo-doux block">{m.description}</span> : null}
                      </td>
                      <td className="tabular-nums">{m.durationHours ?? '—'}</td>
                      <td className="tabular-nums">{m.pointsTotal}</td>
                      <td className="tabular-nums">{m.pointsPresence}</td>
                      <td className="tabular-nums">{m.pointsRessource}</td>
                      <td className="tabular-nums">{m.pointsQuiz}</td>
                      <td className="tabular-nums">{m.weight}</td>
                      <td className="tabular-nums">{m.passThresholdPct} %</td>
                      <td>
                        {formateur ?? formateurEmail ?? <span className="bo-doux">{t.sansFormateur}</span>}
                        {m.trainerId === session.user.id ? <span className="bo-puce ml-2">{fr.admin.utilisateurs.vous}</span> : null}
                      </td>
                      <td>{lienRessources}</td>
                    </tr>
                  )
                }
                return (
                  <tr key={m.id}>
                    <td>
                      <input form="attribution" type="checkbox" name="moduleIds" value={m.id} aria-label={m.title} className="h-4 w-4 accent-bo-bleu" />
                    </td>
                    <td>
                      <form id={idForm} action={modifierModule}>
                        <input type="hidden" name="programId" value={formation.id} />
                        <input type="hidden" name="moduleId" value={m.id} />
                      </form>
                      <input form={idForm} name="position" type="number" min={1} defaultValue={m.position} aria-label={t.position} className="bo-champ !w-14 !px-2 !py-1" />
                    </td>
                    <td className="min-w-56">
                      <input form={idForm} name="title" required defaultValue={m.title} aria-label={t.titreModule} className="bo-champ !py-1" />
                      <input form={idForm} name="description" defaultValue={m.description ?? ''} placeholder={t.description} aria-label={t.description} className="bo-champ mt-1 !py-1 !text-xs" />
                    </td>
                    <td><input form={idForm} name="durationHours" type="number" min={0} step={0.5} defaultValue={m.durationHours ?? ''} aria-label={t.duree} className="bo-champ !w-20 !px-2 !py-1 tabular-nums" /></td>
                    <td><input form={idForm} name="pointsTotal" type="number" min={1} defaultValue={m.pointsTotal} aria-label={t.pointsTotal} className="bo-champ !w-20 !px-2 !py-1 tabular-nums" /></td>
                    <td><input form={idForm} name="pointsPresence" type="number" min={0} defaultValue={m.pointsPresence} aria-label={t.pointsPresence} className="bo-champ !w-20 !px-2 !py-1 tabular-nums" /></td>
                    <td><input form={idForm} name="pointsRessource" type="number" min={0} defaultValue={m.pointsRessource} aria-label={t.pointsRessource} className="bo-champ !w-20 !px-2 !py-1 tabular-nums" /></td>
                    <td><input form={idForm} name="pointsQuiz" type="number" min={0} defaultValue={m.pointsQuiz} aria-label={t.pointsQuiz} className="bo-champ !w-20 !px-2 !py-1 tabular-nums" /></td>
                    <td><input form={idForm} name="weight" type="number" min={0} defaultValue={m.weight} aria-label={t.poids} className="bo-champ !w-16 !px-2 !py-1 tabular-nums" /></td>
                    <td><input form={idForm} name="passThresholdPct" type="number" min={1} max={100} defaultValue={m.passThresholdPct} aria-label={t.seuil} className="bo-champ !w-16 !px-2 !py-1 tabular-nums" /></td>
                    <td>
                      <select form={idForm} name="trainerId" defaultValue={m.trainerId ?? ''} aria-label={t.formateur} className="bo-champ !w-44 !py-1">
                        <option value="">{t.sansFormateur}</option>
                        {formateurs.map((f) => (
                          <option key={f.id} value={f.id}>{f.nom ?? f.email}</option>
                        ))}
                      </select>
                    </td>
                    <td>{lienRessources}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button form={idForm} type="submit" className="bo-bouton-discret !px-3 !py-1.5 !text-xs">{fr.app.enregistrer}</button>
                        <form action={supprimerModule}>
                          <input type="hidden" name="programId" value={formation.id} />
                          <input type="hidden" name="moduleId" value={m.id} />
                          <button type="submit" className="bo-bouton-discret !border-bo-rose/50 !px-3 !py-1.5 !text-xs !text-bo-rose">✕</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {peutModifier ? (
          <>
            <h3 className="mb-2 mt-5 font-semibold">{t.ajouterModule}</h3>
            <form action={ajouterModule} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input type="hidden" name="programId" value={formation.id} />
              <div className="sm:col-span-2">
                <label className="bo-doux mb-1 block" htmlFor="a-title">{t.titreModule}</label>
                <input id="a-title" name="title" required maxLength={200} className="bo-champ" />
              </div>
              <div className="sm:col-span-2">
                <label className="bo-doux mb-1 block" htmlFor="a-description">{t.description}</label>
                <input id="a-description" name="description" maxLength={500} className="bo-champ" />
              </div>
              <div>
                <label className="bo-doux mb-1 block" htmlFor="a-duration">{t.duree}</label>
                <input id="a-duration" name="durationHours" type="number" min={0} step={0.5} className="bo-champ" />
              </div>
              <div>
                <label className="bo-doux mb-1 block" htmlFor="a-total">{t.pointsTotal}</label>
                <Nombre nom="pointsTotal" valeur={100} min={1} label={t.pointsTotal} />
              </div>
              <div>
                <label className="bo-doux mb-1 block" htmlFor="a-presence">{t.pointsPresence}</label>
                <Nombre nom="pointsPresence" valeur={10} label={t.pointsPresence} />
              </div>
              <div>
                <label className="bo-doux mb-1 block" htmlFor="a-ressource">{t.pointsRessource}</label>
                <Nombre nom="pointsRessource" valeur={5} label={t.pointsRessource} />
              </div>
              <div>
                <label className="bo-doux mb-1 block" htmlFor="a-quiz">{t.pointsQuiz}</label>
                <Nombre nom="pointsQuiz" valeur={30} label={t.pointsQuiz} />
              </div>
              <div>
                <label className="bo-doux mb-1 block" htmlFor="a-weight">{t.poids}</label>
                <Nombre nom="weight" valeur={1} label={t.poids} />
              </div>
              <div>
                <label className="bo-doux mb-1 block" htmlFor="a-seuil">{t.seuil}</label>
                <Nombre nom="passThresholdPct" valeur={70} min={1} max={100} label={t.seuil} />
              </div>
              <div>
                <label className="bo-doux mb-1 block" htmlFor="a-trainer">{t.formateur}</label>
                <select id="a-trainer" name="trainerId" defaultValue="" className="bo-champ">
                  <option value="">{t.sansFormateur}</option>
                  {formateurs.map((f) => (
                    <option key={f.id} value={f.id}>{f.nom ?? f.email}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end sm:col-span-2 lg:col-span-4">
                <button type="submit" className="bo-bouton">{t.ajouterModule}</button>
              </div>
            </form>
          </>
        ) : null}
      </section>

      {/* --------------------------------------------------- promotions */}
      {peutModifier ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="bo-panneau">
            <h2 className="mb-2 font-semibold">{t.promotions}</h2>
            {rattachees.length === 0 ? <AlerteSombre>{t.aucunePromotion}</AlerteSombre> : null}
            <ul className="mt-2 space-y-2">
              {rattachees.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {p.name} <span className="bo-doux">({formatDate(p.startsOn)} → {formatDate(p.endsOn)})</span>
                  </span>
                  <form action={detacherPromotion}>
                    <input type="hidden" name="programId" value={formation.id} />
                    <input type="hidden" name="cohortId" value={p.id} />
                    <button type="submit" className="bo-bouton-discret !px-3 !py-1.5 !text-xs">{t.detacher}</button>
                  </form>
                </li>
              ))}
            </ul>
            {libres.length > 0 ? (
              <form action={rattacherPromotion} className="mt-4 flex flex-wrap items-center gap-2">
                <input type="hidden" name="programId" value={formation.id} />
                <select name="cohortId" className="bo-champ !w-auto" aria-label={t.rattacher}>
                  {libres.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button type="submit" className="bo-bouton-discret">{t.rattacher}</button>
              </form>
            ) : null}
          </div>

          <div className="bo-panneau">
            <h2 className="mb-2 font-semibold">{t.supprimer}</h2>
            {searchParams.supprimer === '1' ? (
              <form action={supprimerFormation} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="programId" value={formation.id} />
                <span className="text-sm text-bo-rose">{t.confirmerSuppression}</span>
                <button type="submit" className="bo-bouton-discret !border-bo-rose/50 !text-bo-rose">{t.supprimer}</button>
                <Link href={`/admin/modules/${formation.id}`} className="bo-doux underline">{fr.app.annuler}</Link>
              </form>
            ) : (
              <Link href={`/admin/modules/${formation.id}?supprimer=1`} className="bo-bouton-discret !border-bo-rose/50 !text-bo-rose">
                {t.supprimer}
              </Link>
            )}
          </div>
        </section>
      ) : (
        <section className="bo-panneau">
          <h2 className="mb-2 font-semibold">{t.promotions}</h2>
          {rattachees.length === 0 ? <p className="bo-doux">{t.aucunePromotion}</p> : null}
          <ul className="mt-2 space-y-1 text-sm">
            {rattachees.map((p) => (
              <li key={p.id}>
                {p.name} <span className="bo-doux">({formatDate(p.startsOn)} → {formatDate(p.endsOn)})</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
