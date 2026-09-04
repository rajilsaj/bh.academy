import Link from 'next/link'
import { redirect } from 'next/navigation'
import { asc, eq } from 'drizzle-orm'
import { Bloc, LearnerShell } from '@/components/LearnerShell'
import { auth, googleActive } from '@/lib/auth'
import { db } from '@/lib/db'
import { cohorts, learners } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { formatDate } from '@/lib/format'
import { connexionGoogleEspace, deconnexionEspace } from './actions'

export const dynamic = 'force-dynamic'

const t = fr.espace

/** Le trait « G » de Google, en quatre couleurs, sans image externe. */
function MarqueGoogle() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.3 7.3 0 0 1-10.9-3.8H1.2v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.2 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.2a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.5-3.5A12 12 0 0 0 1.2 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z" />
    </svg>
  )
}

/**
 * La porte unique : « Mon espace ». Le personnel file vers le Cockpit ; un
 * apprenant validé vers ses pages ; un apprenant en attente voit où il en
 * est ; un compte Google inconnu est invité à s'inscrire.
 */
export default async function MonEspacePage() {
  const session = await auth()
  if (session?.user?.role) redirect('/admin')

  if (session?.user?.googleSub) {
    const [apprenant] = await db
      .select({ id: learners.id, token: learners.token, fullName: learners.fullName, validatedAt: learners.validatedAt, createdAt: learners.createdAt })
      .from(learners)
      .where(eq(learners.googleSub, session.user.googleSub))
      .limit(1)

    if (apprenant?.validatedAt) redirect(`/l/${apprenant.token}`)

    const [cohorte] = await db.select().from(cohorts).orderBy(asc(cohorts.startsOn)).limit(1)
    return (
      <LearnerShell title={t.titre} vitrine avecAccent accueilHref="/" fond="espace">
        <Bloc className="space-y-3 text-center">
          {apprenant ? (
            <>
              <p className="manuscrit text-4xl">{t.enAttenteAccroche}</p>
              <p className="titre text-2xl">{t.enAttenteTitre}</p>
              <p className="text-sm text-slate-700">{t.enAttenteTexte}</p>
              <p className="text-sm text-slate-500">
                {t.inscritLe} {formatDate(apprenant.createdAt)} · {apprenant.id}
              </p>
            </>
          ) : (
            <>
              <p className="titre text-2xl">{t.inconnuTitre}</p>
              <p className="text-sm text-slate-700">{t.inconnuTexte}</p>
              {cohorte ? (
                <Link href={`/inscription/${cohorte.id}`} className="bouton-principal !py-3 !text-base">
                  {fr.vitrine.nav.inscription}
                </Link>
              ) : null}
            </>
          )}
          <p className="text-sm text-slate-500">
            {t.connecteAvec} <strong>{session.user.email}</strong>
          </p>
          <form action={deconnexionEspace}>
            <button type="submit" className="text-sm font-semibold text-vitrine-violet underline underline-offset-2">
              {t.changerCompte}
            </button>
          </form>
        </Bloc>
      </LearnerShell>
    )
  }

  return (
    <LearnerShell title={t.titre} vitrine avecAccent accueilHref="/" fond="espace">
      <Bloc className="space-y-4">
        <p className="titre text-2xl">{t.accrocheTitre}</p>
        <p className="text-sm text-slate-700">{t.accrocheTexte}</p>
        {googleActive ? (
          <form action={connexionGoogleEspace}>
            <button type="submit" className="bouton-principal !gap-3">
              <MarqueGoogle />
              {t.bouton}
            </button>
          </form>
        ) : (
          <p className="rounded-bloc bg-vitrine-lavande px-3 py-2 text-sm text-vitrine-violet-fonce">{fr.inscription.google.indisponible}</p>
        )}
        <p className="text-sm text-slate-500">
          {t.personnel}{' '}
          <Link href="/admin/login" className="font-semibold text-vitrine-violet underline underline-offset-2">
            {t.personnelLien}
          </Link>
        </p>
      </Bloc>
    </LearnerShell>
  )
}
