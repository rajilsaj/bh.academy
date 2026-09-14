import { requirePermission } from '@/lib/auth'
import { getSession as getSessionData, getTrainerSessions, getAllTrainers } from '@/lib/training/queries'
import { assessTrainerEligibility } from '@/lib/training/rules'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await requirePermission('voirTableauBord')
  if (!session) return new Response('Accès refusé', { status: 403 })

  try {
    const sessionData = await getSessionData(params.id)
    if (!sessionData) return new Response('Session not found', { status: 404 })

    const allTrainers = await getAllTrainers({ status: 'actif' })

    const eligibleList = await Promise.all(
      allTrainers.map(async (trainer) => {
        const overlappingSessions = await getTrainerSessions(trainer.id, params.id)

        const eligibilityResult = assessTrainerEligibility({
          trainer: {
            id: trainer.id,
            fullName: trainer.fullName,
            email: trainer.email,
            source: trainer.source,
            status: trainer.status,
            skills: trainer.skills || [],
            availabilityWindows: trainer.availabilityWindows || [],
          },
          session: {
            id: sessionData.id,
            opensAt: sessionData.opensAt,
            closesAt: sessionData.closesAt,
          },
          requiredSkills: sessionData.requiredSkills || [],
          overlappingSessions,
        })

        return {
          ...trainer,
          eligibility: eligibilityResult.eligibility,
          reasons: eligibilityResult.reasons,
        }
      }),
    )

    return Response.json(eligibleList)
  } catch (error) {
    console.error('Get eligible trainers error:', error)
    return Response.json(
      { error: 'Failed to fetch eligible trainers', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
