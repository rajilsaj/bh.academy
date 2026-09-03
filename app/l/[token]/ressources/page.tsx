import { asc, desc, eq } from 'drizzle-orm'
import { Bloc, LearnerShell, LienInvalide } from '@/components/LearnerShell'
import { db } from '@/lib/db'
import { cohorts, pointsLedger, programModules, resources } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { getLearnerByToken } from '@/lib/queries'

export const dynamic = 'force-dynamic'

const t = fr.learner.ressources

/**
 * Les supports de cours, module par module. Chaque ouverture crédite les points
 * de la ressource — une seule fois. Page sans JavaScript, comme tout l'espace
 * apprenant.
 */
export default async function RessourcesApprenant({ params }: { params: { token: string } }) {
  const learner = await getLearnerByToken(params.token)
  if (!learner) return <LienInvalide />

  const [promo] = await db.select().from(cohorts).where(eq(cohorts.id, learner.cohortId)).limit(1)
  const liste = promo?.programId
    ? await db
        .select({ r: resources, module: programModules.title, position: programModules.position })
        .from(resources)
        .innerJoin(programModules, eq(programModules.id, resources.moduleId))
        .where(eq(programModules.programId, promo.programId))
        .orderBy(asc(programModules.position), desc(resources.createdAt))
    : []
  const dejaOuvertes = new Set(
    (
      await db
        .select({ refId: pointsLedger.refId })
        .from(pointsLedger)
        .where(eq(pointsLedger.learnerId, learner.id))
    )
      .map((p) => p.refId)
      .filter(Boolean),
  )

  const parModule = new Map<string, typeof liste>()
  for (const l of liste) {
    const cle = `${l.position}. ${l.module}`
    if (!parModule.has(cle)) parModule.set(cle, [])
    parModule.get(cle)!.push(l)
  }
  const base = `/l/${learner.token}`

  return (
    <LearnerShell title={t.titre} vitrine accueilHref={base} parcoursHref={`${base}/parcours`}>
      <p className="-mt-3 text-sm text-white/75">{t.intro}</p>
      {parModule.size === 0 ? (
        <Bloc className="mt-5">
          <p className="text-sm text-slate-600">{t.aucune}</p>
        </Bloc>
      ) : null}
      {[...parModule.entries()].map(([module, items]) => (
        <Bloc key={module} className="mt-4">
          <h2 className="titre text-lg">{module}</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {items.map(({ r }) => {
              const ouverte = dejaOuvertes.has(r.id)
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{r.title}</p>
                    <p className="text-xs text-slate-500">
                      {fr.admin.ressources.types[r.kind]} · {ouverte ? fr.learner.dejaFait : `+${r.points} ${t.points}`}
                    </p>
                  </div>
                  <a href={`${base}/ressources/${r.id}`} className="bouton-pilule shrink-0 !bg-vitrine-violet !text-white">
                    {t.ouvrir}
                  </a>
                </li>
              )
            })}
          </ul>
        </Bloc>
      ))}
    </LearnerShell>
  )
}
