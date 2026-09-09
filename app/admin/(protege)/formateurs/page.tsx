import Link from 'next/link'
import { asc, eq } from 'drizzle-orm'
import { AccesRefuse } from '@/components/AccesRefuse'
import { EnTete, TitreSection, Vide } from '@/components/admin/Cockpit'
import { requirePermission } from '@/lib/auth'
import { db } from '@/lib/db'
import { staff, trainerProfiles } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { FILTRES_VILLE, filtrerParVille, filtreVilleDepuis, initiales, libelleFiltreVille, nomFichierFormateurs } from '@/lib/formateurs'

export const dynamic = 'force-dynamic'

const t = fr.admin.formateurs
const u = fr.admin.utilisateurs

/**
 * Les formateurs seuls, avec ce qui sert à les joindre et à les présenter :
 * ville, téléphone, LinkedIn, site web, profil. Un filtre par ville, et la
 * liste filtrée se télécharge en Excel ou en PDF. La fiche se modifie depuis
 * la page Utilisateurs.
 */
export default async function FormateursPage({ searchParams }: { searchParams: { ville?: string } }) {
  const session = await requirePermission('gererUtilisateurs')
  if (!session) return <AccesRefuse />

  const filtre = filtreVilleDepuis(searchParams.ville)
  const tous = await db
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

  const formateurs = filtrerParVille(tous, filtre)
  const onglets = FILTRES_VILLE.map((f) => ({ cle: f, label: libelleFiltreVille(f), n: filtrerParVille(tous, f).length }))
  const lienFiltre = (f: (typeof FILTRES_VILLE)[number]) => (f === 'tous' ? '/admin/formateurs' : `/admin/formateurs?ville=${encodeURIComponent(f)}`)
  const lienExport = (format: 'xlsx' | 'pdf') =>
    `/admin/formateurs/export?${new URLSearchParams({ ...(format === 'pdf' ? { format } : {}), ...(filtre === 'tous' ? {} : { ville: filtre }) })}`

  return (
    <div className="space-y-6">
      <EnTete
        titre={t.titre}
        sousTitre={t.sousTitre}
        actions={
          <>
            <Link href="/admin/utilisateurs" className="bo-bouton-discret">{t.ajouter}</Link>
            <a href={lienExport('pdf')} className="bo-bouton-discret" download={nomFichierFormateurs(filtre, 'pdf')}>{t.exporterPdf}</a>
            <a href={lienExport('xlsx')} className="bo-bouton" download={nomFichierFormateurs(filtre, 'xlsx')}>{t.exporter}</a>
          </>
        }
      />

      <section className="bo-panneau">
        <TitreSection titre={t.liste} compte={formateurs.length} />

        {/* Filtre par ville, en onglets ; les téléchargements suivent le filtre. */}
        <div className="bo-onglets mb-3">
          {onglets.map((o) => (
            <Link key={o.cle} href={lienFiltre(o.cle)} className={o.cle === filtre ? 'bo-onglet-actif' : 'bo-onglet'}>
              {o.label} <span className={o.cle === filtre ? 'opacity-80' : 'bo-doux'}>({o.n})</span>
            </Link>
          ))}
        </div>

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
                      <td className="whitespace-nowrap">{f.phone ?? <span className="text-bo-jaune">{t.telephoneAChercher}</span>}</td>
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
