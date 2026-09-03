import Link from 'next/link'
import { asc, desc, eq, inArray, sql as raw } from 'drizzle-orm'
import { AccesRefuse, AlerteSombre, SuccesSombre } from '@/components/AccesRefuse'
import { requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { programModules, programs, RESOURCE_KINDS, resources, staff, trainerProfiles } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { formatDateTime } from '@/lib/format'
import { ajouterRessource, supprimerRessource } from './actions'

export const dynamic = 'force-dynamic'

const t = fr.admin.ressources

/**
 * Les ressources d'un module : ce que le formateur dépose, ce que l'apprenant
 * télécharge. Un formateur ne voit que ses modules ; l'équipe voit tout.
 */
export default async function RessourcesPage({ searchParams }: { searchParams: { module?: string; ok?: string; e?: string } }) {
  const session = await requirePermission('gererRessources')
  if (!session) return <AccesRefuse />
  const estFormateur = session.user.role === 'formateur'

  const modules = await db
    .select({ id: programModules.id, title: programModules.title, position: programModules.position, formation: programs.name, programId: programs.id })
    .from(programModules)
    .innerJoin(programs, eq(programs.id, programModules.programId))
    .where(estFormateur ? eq(programModules.trainerId, session.user.id) : raw`true`)
    .orderBy(asc(programs.name), asc(programModules.position))

  const moduleIds = modules.map((m) => m.id)
  const selection = searchParams.module && moduleIds.includes(searchParams.module) ? searchParams.module : null
  const liste = moduleIds.length
    ? await db
        .select({
          r: resources,
          module: programModules.title,
          formation: programs.name,
          deposePar: trainerProfiles.fullName,
          deposeParEmail: staff.email,
        })
        .from(resources)
        .innerJoin(programModules, eq(programModules.id, resources.moduleId))
        .innerJoin(programs, eq(programs.id, programModules.programId))
        .leftJoin(staff, eq(staff.id, resources.trainerId))
        .leftJoin(trainerProfiles, eq(trainerProfiles.staffId, staff.id))
        .where(selection ? eq(resources.moduleId, selection) : inArray(resources.moduleId, moduleIds))
        .orderBy(asc(programs.name), asc(programModules.position), desc(resources.createdAt))
    : []

  const messageOk = searchParams.ok ? t.messages[searchParams.ok as keyof typeof t.messages] : null
  const messageErreur = searchParams.e ? t.messages[searchParams.e as keyof typeof t.messages] : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">{t.titre}</h1>
        <p className="mt-1 text-sm text-bo-doux">{t.sousTitre}</p>
      </div>
      {messageOk ? <SuccesSombre>{messageOk}</SuccesSombre> : null}
      {messageErreur ? <AlerteSombre>{messageErreur}</AlerteSombre> : null}

      {modules.length === 0 ? (
        <p className="bo-panneau text-sm text-bo-doux">{t.aucunModule}</p>
      ) : (
        <>
          <nav className="flex flex-wrap gap-1" aria-label={t.module}>
            <Link href="/admin/ressources" className={selection ? 'bo-puce' : 'bo-puce !bg-white !text-bo-fond'}>
              {t.tous}
            </Link>
            {modules.map((m) => (
              <Link
                key={m.id}
                href={`/admin/ressources?module=${m.id}`}
                className={selection === m.id ? 'bo-puce !bg-white !text-bo-fond' : 'bo-puce'}
              >
                {m.position}. {m.title}
              </Link>
            ))}
          </nav>

          <section className="bo-panneau">
            <div className="overflow-x-auto">
              <table className="bo-tableau">
                <thead>
                  <tr>
                    <th>{t.module}</th>
                    <th>{t.type}</th>
                    <th>{t.titreRessource}</th>
                    <th>{t.points}</th>
                    <th>{t.deposePar}</th>
                    <th>{fr.app.date}</th>
                    <th>{fr.app.action}</th>
                  </tr>
                </thead>
                <tbody>
                  {liste.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-bo-doux">{t.aucune}</td>
                    </tr>
                  ) : null}
                  {liste.map(({ r, module, formation, deposePar, deposeParEmail }) => (
                    <tr key={r.id}>
                      <td>
                        {module}
                        <span className="bo-doux block">{formation}</span>
                      </td>
                      <td className="whitespace-nowrap">{t.types[r.kind]}</td>
                      <td>
                        <a href={`/api/ressources/${r.id}`} className="underline" target="_blank" rel="noopener">
                          {r.title}
                        </a>
                        {r.url ? <span className="bo-doux block break-all">{r.url}</span> : null}
                      </td>
                      <td className="tabular-nums">{r.points}</td>
                      <td>{deposePar ?? deposeParEmail ?? '—'}</td>
                      <td className="whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                      <td>
                        <form action={supprimerRessource}>
                          <input type="hidden" name="resourceId" value={r.id} />
                          <button type="submit" className="bo-bouton-discret !border-bo-rose/50 !px-3 !py-1.5 !text-xs !text-bo-rose">
                            {t.supprimer}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bo-panneau">
            <h2 className="mb-3 font-semibold">{t.ajouter}</h2>
            <form action={ajouterRessource} encType="multipart/form-data" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="bo-doux mb-1 block" htmlFor="moduleId">{t.module}</label>
                <select id="moduleId" name="moduleId" defaultValue={selection ?? modules[0].id} className="bo-champ">
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.formation} — {m.position}. {m.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="bo-doux mb-1 block" htmlFor="kind">{t.type}</label>
                <select id="kind" name="kind" defaultValue="presentation" className="bo-champ">
                  {RESOURCE_KINDS.map((k) => (
                    <option key={k} value={k}>{t.types[k]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="bo-doux mb-1 block" htmlFor="title">{t.titreRessource}</label>
                <input id="title" name="title" required maxLength={200} className="bo-champ" />
              </div>
              <div>
                <label className="bo-doux mb-1 block" htmlFor="url">{t.lien}</label>
                <input id="url" name="url" type="url" placeholder="https://" className="bo-champ" />
              </div>
              <div>
                <label className="bo-doux mb-1 block" htmlFor="fichier">{t.fichier}</label>
                <input id="fichier" name="fichier" type="file" className="bo-champ !py-1.5 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1 file:text-xs file:font-semibold file:text-bo-fond" />
                <p className="bo-doux mt-1">{t.lienOuFichier}</p>
              </div>
              <div>
                <label className="bo-doux mb-1 block" htmlFor="points">{t.points}</label>
                <input id="points" name="points" type="number" min={0} defaultValue={5} className="bo-champ" />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <button type="submit" className="bo-bouton">{t.ajouter}</button>
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  )
}
