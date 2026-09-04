import { eq } from 'drizzle-orm'
import { Bloc, LearnerShell } from '@/components/LearnerShell'
import { db } from '@/lib/db'
import { learners } from '@/lib/db/schema'
import { isWellFormedToken } from '@/lib/ids'
import { fr } from '@/lib/i18n/fr'
import { formatDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

/**
 * Toutes les pages apprenant passent par ici : tant que l'inscription n'est
 * pas validée par un administrateur, l'espace reste fermé et la page le dit.
 * Un lien mal formé ou inconnu est laissé aux pages, qui affichent déjà
 * « lien invalide ».
 */
export default async function EspaceApprenantLayout({ children, params }: { children: React.ReactNode; params: { token: string } }) {
  if (isWellFormedToken(params.token)) {
    const [apprenant] = await db
      .select({ validatedAt: learners.validatedAt, createdAt: learners.createdAt })
      .from(learners)
      .where(eq(learners.token, params.token))
      .limit(1)
    if (apprenant && !apprenant.validatedAt) {
      const t = fr.espace
      return (
        <LearnerShell title={t.titre} accueilHref="/" fond="espace">
          <Bloc className="space-y-3 text-center">
            <p className="titre text-2xl">{t.enAttenteTitre}</p>
            <p className="text-sm text-slate-700">{t.enAttenteTexte}</p>
            <p className="text-sm text-slate-500">
              {t.inscritLe} {formatDate(apprenant.createdAt)}
            </p>
          </Bloc>
        </LearnerShell>
      )
    }
  }
  return <>{children}</>
}
