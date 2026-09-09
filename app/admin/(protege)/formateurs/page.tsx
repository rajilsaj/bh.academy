import Link from 'next/link'
import { asc, eq } from 'drizzle-orm'
import { AccesRefuse } from '@/components/AccesRefuse'
import { EnTete, TitreSection, Vide } from '@/components/admin/Cockpit'
import { requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { staff, TRAINER_CITIES, trainerProfiles } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { initiales } from '@/lib/formateurs'

export const dynamic = 'force-dynamic'

const t = fr.admin.formateurs
const u = fr.admin.utilisateurs

/**
 * Les formateurs seuls, avec ce qui sert à les joindre et à les présenter :
 * ville, téléphone, LinkedIn, site web, profil. La même liste se télécharge
 * en Excel. La fiche se modifie depuis la page Utilisateurs.
 */
export default async function FormateursPage() {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) return <AccesRefuse />

  const formateurs = await db
    .select({
      id: staff.id,
      nom: trainerProfiles.fullName,
      phone: trainerProfiles.phone,
      city: trainerProfiles.city,
      linkedin: trainerProfiles.linkedin,
      website: trainerProfiles.website,
      bio: trainerProfiles.bio,
      photoPath: trainerProfiles.photoPath,
      confirme: trainerProfiles.confirmedAt,
      token: trainerProfiles.invitationToken,
    })
    .from(trainerProfiles)
    .innerJoin(staff, eq(staff.id, trainerProfiles.staffId))
    .where(eq(staff.role, 'formateur'))
    .orderBy(asc(trainerProfiles.fullName))

  const parVille = TRAINER_CITIES.map((ville) => ({ ville, n: formateurs.filter((f) => f.city === ville).length }))
  const sansVille = formateurs.filter((f) => !f.city).length
  const repartition = [
    ...parVille.map((v) => t.parVille.replace('{ville}', v.ville).replace('{n}', String(v.n))),
    ...(sansVille > 0 ? [t.sansVille.replace('{n}', String(sansVille))] : []),
  ].join(' · ')

  return (
    <div className="space-y-6">
      <EnTete
        titre={t.titre}
        sousTitre={t.sousTitre}
        actions={
          <>
            <Link href="/admin/utilisateurs" className="bo-bouton-discret">{t.ajouter}</Link>
            <a href="/admin/formateurs/export" className="bo-bouton" download="formateurs.xlsx">{t.exporter}</a>
          </>
        }
      />

      <section className="bo-panneau">
        <TitreSection titre={t.liste} compte={formateurs.length} actions={<p className="bo-doux">{repartition}</p>} />

        {formateurs.length === 0 ? (
          <Vide titre={t.aucun} texte={t.aucunAide} action={<Link href="/admin/utilisateurs" className="bo-bouton">{t.ajouter}</Link>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="bo-tableau">
              <thead>
                <tr>
                  <th>{t.colonneNom}</th>
                  <th>{t.colonneVille}</th>
                  <th>{t.colonneTelephone}</th>
                  <th>{t.colonneLiens}</th>
                  <th>{t.colonneProfil}</th>
                  <th>{t.colonneStatut}</th>
                  <th>{fr.app.action}</th>
                </tr>
              </thead>
              <tbody>
                {formateurs.map((f) => {
                  const statut = f.confirme ? u.confirme : f.token ? u.invite : u.enAttente
                  return (
                    <tr key={f.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          {f.photoPath ? (
                            <img src={`/api/formateurs/${f.id}/photo`} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-full object-cover" />
                          ) : (
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-bo-panneau-2 text-xs font-bold text-bo-doux">{initiales(f.nom)}</span>
                          )}
                          <span className="font-medium">{f.nom}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">{f.city ?? <span className="bo-doux">—</span>}</td>
                      <td className="whitespace-nowrap">{f.phone ?? <span className="bo-doux">—</span>}</td>
                      <td>
                        <div className="flex flex-col gap-0.5">
                          {f.linkedin ? (
                            <a href={f.linkedin} target="_blank" rel="noreferrer" className="break-all underline decoration-bo-doux underline-offset-2 hover:text-bo-bleu">
                              LinkedIn
                            </a>
                          ) : null}
                          {f.website ? (
                            <a href={f.website} target="_blank" rel="noreferrer" className="break-all underline decoration-bo-doux underline-offset-2 hover:text-bo-bleu">
                              {f.website.replace(/^https?:\/\//, '')}
                            </a>
                          ) : null}
                          {!f.linkedin && !f.website ? <span className="bo-doux">—</span> : null}
                        </div>
                      </td>
                      <td className="max-w-md">{f.bio ? <span className="line-clamp-3">{f.bio}</span> : <span className="bo-doux">—</span>}</td>
                      <td className="whitespace-nowrap">
                        <span className={`bo-puce ${f.confirme ? '!border-bo-menthe/40 !text-bo-menthe' : '!border-bo-jaune/60 !text-bo-jaune'}`}>{statut}</span>
                      </td>
                      <td>
                        <Link href={`/admin/utilisateurs?filtre=formateur&fiche=${f.id}`} className="bo-bouton-discret !px-3 !py-1.5 !text-xs">
                          {t.modifier}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
