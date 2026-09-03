import Link from 'next/link'
import { AccesRefuse, NiveauBadge } from '@/components/AccesRefuse'
import { can, requirePermission } from '@/lib/auth'
import { learnerLink } from '@/lib/config'
import { LEVEL_CLASS, daysSince, levelLabel } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'
import { getOpenWave, getRelanceRows } from '@/lib/queries'
import { toWhatsAppNumber } from '@/lib/format'

export const dynamic = 'force-dynamic'

/**
 * Le message WhatsApp est pré-rempli côté serveur puis simplement collé dans le
 * groupe : aucune API WhatsApp, aucun envoi automatique. C'est un lien wa.me.
 */
function messageRelance(params: {
  nom: string
  lien: string
  sansReponse: boolean
  absent: boolean
  vague: string
}): string {
  const { motifTexteVague, motifTexteAbsence, motifTexteLesDeux, modeleMessage } =
    fr.admin.relance

  let motif: string
  if (params.sansReponse && params.absent) motif = motifTexteLesDeux
  else if (params.sansReponse) motif = motifTexteVague
  else motif = motifTexteAbsence

  return modeleMessage
    .replace('{nom}', params.nom.split(' ')[0])
    .replace('{motif}', motif.replace('{vague}', params.vague))
    .replace('{lien}', params.lien)
}

export default async function RelancePage() {
  const session = await requirePermission('voirRelance')
  if (!session) return <AccesRefuse />

  const voitCoordonnees = can(session.user.role, 'voirCoordonnees')
  const [rows, openWave] = await Promise.all([getRelanceRows(), getOpenWave()])
  const vague = openWave?.labelFr ?? ''

  return (
    <div>
      <h1 className="text-xl font-bold">{fr.admin.relance.titre}</h1>
      <p className="mt-1 text-sm text-bo-doux">{fr.admin.relance.sousTitre}</p>

      {rows.length === 0 ? (
        <p className="bo-panneau mt-4">{fr.admin.relance.aucun}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="bo-tableau">
            <thead>
              <tr>
                <th>{fr.admin.relance.colonneNom}</th>
                {voitCoordonnees ? <th>{fr.admin.relance.colonneTelephone}</th> : null}
                <th>{fr.admin.relance.colonneNiveau}</th>
                <th>{fr.admin.relance.colonneMotif}</th>
                <th>{fr.admin.relance.colonneDernierContact}</th>
                <th>{fr.admin.relance.colonneAction}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const jours = daysSince(row.last_contact_at)
                const numero = voitCoordonnees ? toWhatsAppNumber(row.phone) : null
                const lien = learnerLink(row.token)
                const texte = messageRelance({
                  nom: row.full_name,
                  lien,
                  sansReponse: row.sans_reponse,
                  absent: row.absent_derniere_seance,
                  vague,
                })
                const motif =
                  row.sans_reponse && row.absent_derniere_seance
                    ? fr.admin.relance.motifs.lesDeux
                    : row.sans_reponse
                      ? fr.admin.relance.motifs.vagueSansReponse
                      : fr.admin.relance.motifs.absentDerniereSeance

                return (
                  <tr key={row.learner_id}>
                    <td>
                      <Link href={`/admin/learners/${row.learner_id}`} className="underline">
                        {row.full_name}
                      </Link>
                      <span className="block text-xs text-bo-doux">{row.learner_id}</span>
                    </td>
                    {voitCoordonnees ? (
                      <td className="whitespace-nowrap">
                        {row.phone ?? fr.admin.relance.pasDeTelephone}
                      </td>
                    ) : null}
                    <td>
                      <NiveauBadge
                        level={levelLabel(row.level)}
                        className={LEVEL_CLASS[row.level]}
                      />
                    </td>
                    <td>{motif}</td>
                    <td className="whitespace-nowrap">
                      {jours === null
                        ? fr.admin.relance.jamais
                        : `${jours} ${fr.admin.relance.jours}`}
                    </td>
                    <td>
                      {numero ? (
                        <a
                          className="bo-bouton whitespace-nowrap"
                          href={`https://wa.me/${numero}?text=${encodeURIComponent(texte)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {fr.admin.relance.boutonWhatsapp}
                        </a>
                      ) : (
                        <span className="text-xs text-bo-doux">
                          {fr.admin.relance.pasDeTelephone}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
