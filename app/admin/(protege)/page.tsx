import Link from 'next/link'
import { and, asc, count, eq, gte, isNull } from 'drizzle-orm'
import { EnTete, Stat, TitreSection, Vide } from '@/components/admin/Cockpit'
import { auth, can } from '@/lib/auth'
import { db } from '@/lib/db'
import { cohorts, learners, programModules, sessions, staff } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { formatDate, formatDateTime } from '@/lib/format'
import { statsVisites } from '@/lib/visites'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

const t = fr.admin.tableau

/**
 * L'accueil du Cockpit : les chiffres qui comptent, les prochaines sessions,
 * et les raccourcis vers ce qu'on fait le plus souvent.
 */
export default async function AccueilCockpit() {
  const session = await auth()
  if (!session?.user?.role) redirect('/admin/login')
  const role = session.user.role
  const admin = can(role, 'gererUtilisateurs')

  const maintenant = new Date()
  const [[apprenants], [enAttente], [formateurs], [modules], prochaines, visites] = await Promise.all([
    db.select({ n: count() }).from(learners),
    db.select({ n: count() }).from(learners).where(isNull(learners.validatedAt)),
    db.select({ n: count() }).from(staff).where(eq(staff.role, 'formateur')),
    db.select({ n: count() }).from(programModules),
    db
      .select({
        id: sessions.id,
        moduleName: sessions.moduleName,
        heldOn: sessions.heldOn,
        opensAt: sessions.opensAt,
        closesAt: sessions.closesAt,
        dayCode: sessions.dayCode,
        cohort: cohorts.name,
      })
      .from(sessions)
      .innerJoin(cohorts, eq(cohorts.id, sessions.cohortId))
      .where(and(gte(sessions.closesAt, maintenant)))
      .orderBy(asc(sessions.opensAt))
      .limit(6),
    admin ? statsVisites().catch(() => null) : Promise.resolve(null),
  ])

  const enCours = prochaines.filter((s) => s.opensAt <= maintenant && s.closesAt >= maintenant)

  return (
    <div className="space-y-6">
      <EnTete
        titre={t.titre}
        sousTitre={t.sousTitre}
        actions={
          admin ? (
            <>
              <Link href="/admin/sessions" className="bo-bouton">{t.planifier}</Link>
              <Link href="/admin/utilisateurs" className="bo-bouton-discret">{fr.admin.utilisateurs.creer}</Link>
            </>
          ) : (
            <Link href="/admin/ressources" className="bo-bouton">{fr.admin.ressources.ajouter}</Link>
          )
        }
      />

      {/* ------------------------------------------------------------ chiffres */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={enAttente.n > 0 && admin ? t.enAttente : t.apprenants}
          valeur={enAttente.n > 0 && admin ? enAttente.n : apprenants.n}
          detail={enAttente.n > 0 && admin ? `${apprenants.n} ${t.apprenants.toLowerCase()}` : undefined}
          accent={enAttente.n > 0 && admin ? 'jaune' : 'blanc'}
          href={admin ? '/admin/utilisateurs' : undefined}
        />
        <Stat label={t.formateurs} valeur={formateurs.n} accent="menthe" href={admin ? '/admin/utilisateurs' : undefined} />
        <Stat label={t.modules} valeur={modules.n} accent="blanc" href="/admin/modules" />
        {visites ? (
          <Stat label={t.visitesSemaine} valeur={visites.semaine.visites} detail={`${visites.semaine.visiteurs} ${fr.admin.visites.visiteursUniques}`} accent="rose" href="/admin/visites" />
        ) : (
          <Stat label={t.sessionsAVenir} valeur={prochaines.length} accent="rose" href="/admin/sessions" />
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {/* -------------------------------------------- prochaines sessions */}
        <div className="bo-panneau lg:col-span-2">
          <TitreSection
            titre={t.prochainesSessions}
            actions={<Link href="/admin/sessions" className="bo-doux underline">{t.toutesLesSessions}</Link>}
          />
          {prochaines.length === 0 ? (
            <Vide
              titre={t.aucuneSession}
              texte={t.aucuneSessionAide}
              action={admin ? <Link href="/admin/sessions" className="bo-bouton">{t.planifier}</Link> : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="bo-tableau">
                <thead>
                  <tr>
                    <th>{fr.admin.sessions.module}</th>
                    <th>{fr.app.date}</th>
                    <th>{fr.admin.sessions.horaire}</th>
                    <th>{fr.admin.sessions.codeDuJour}</th>
                  </tr>
                </thead>
                <tbody>
                  {prochaines.map((s) => {
                    const ouverte = enCours.some((e) => e.id === s.id)
                    return (
                      <tr key={s.id}>
                        <td>
                          <span className="font-medium">{s.moduleName}</span>
                          <span className="bo-doux block">{s.cohort}</span>
                        </td>
                        <td className="whitespace-nowrap">{formatDate(s.heldOn)}</td>
                        <td className="whitespace-nowrap">
                          {formatDateTime(s.opensAt).slice(-5)} – {formatDateTime(s.closesAt).slice(-5)}
                        </td>
                        <td>
                          <span className={`font-mono text-sm ${ouverte ? 'text-bo-menthe' : ''}`}>{s.dayCode}</span>
                          {ouverte ? <span className="bo-puce ml-2 !border-bo-menthe/40 !text-bo-menthe">{t.enCours}</span> : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------ raccourcis */}
        <div className="bo-panneau">
          <TitreSection titre={t.raccourcis} />
          <ul className="space-y-2">
            {(
              [
                admin ? { href: '/admin/utilisateurs', label: t.rAjouterFormateur } : null,
                admin ? { href: '/admin/modules', label: t.rAttribuerModules } : null,
                admin ? { href: '/admin/sessions', label: t.rPlanifierSemaine } : null,
                { href: '/admin/ressources', label: t.rDeposerRessource },
                admin ? { href: '/admin/utilisateurs/export/apprenants.xlsx', label: t.rExporterApprenants } : null,
                admin ? { href: '/admin/configuration', label: t.rVerifierConfiguration } : null,
              ] as ({ href: string; label: string } | null)[]
            )
              .filter((r): r is { href: string; label: string } => r !== null)
              .map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className="flex items-center justify-between rounded-lg border border-bo-bordure px-3 py-2 text-sm transition-colors hover:border-bo-bleu hover:bg-bo-panneau-2">
                    {r.label}
                    <span aria-hidden>→</span>
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
