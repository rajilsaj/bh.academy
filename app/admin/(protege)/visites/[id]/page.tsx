import { AccesRefuse } from '@/components/AccesRefuse'
import { VisitesVisiteur } from '@/components/VisitesVisiteur'
import { requirePermission } from '@/lib/auth'
import { fr } from '@/lib/i18n/fr'
import { detailVisiteur } from '@/lib/visites'
import { effacerVisiteur } from '../actions'

export const dynamic = 'force-dynamic'

export default async function VisiteurPage({ params }: { params: { id: string } }) {
  const session = await requirePermission('voirVisites')
  if (!session) return <AccesRefuse />
  if (!/^[0-9a-f-]{36}$/.test(params.id)) return <p className="bo-panneau">{fr.app.aucuneDonnee}</p>

  const detail = await detailVisiteur(params.id)
  if (!detail) return <p className="bo-panneau">{fr.app.aucuneDonnee}</p>

  return <VisitesVisiteur visitorId={params.id} detail={detail} supprimer={effacerVisiteur} />
}
