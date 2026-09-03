import { AccesRefuse } from '@/components/AccesRefuse'
import { requirePermission } from '@/lib/auth'
import { fr } from '@/lib/i18n/fr'

export const dynamic = 'force-dynamic'

const TABLES = [
  'cohorts',
  'learners',
  'staff',
  'sessions',
  'attendance',
  'quizzes',
  'quiz_questions',
  'quiz_attempts',
  'waves',
  'responses',
  'documents',
  'outcomes',
  'certificates',
  'niveaux',
  'parcours',
  'modules',
  'indicateurs',
  'programs',
  'program_modules',
  'formateurs',
  'resources',
  'points',
  'points_modules',
  'completion',
  'decisions',
  'kit',
  'notifications',
]

export default async function ExportPage() {
  const session = await requirePermission('gererExport')
  if (!session) return <AccesRefuse />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">{fr.admin.exportPage.titre}</h1>
        <p className="mt-1 text-sm text-bo-doux">{fr.admin.exportPage.sousTitre}</p>
      </div>

      <section className="bo-panneau">
        <h2 className="mb-2 font-semibold">{fr.admin.exportPage.tableauBord}</h2>
        <a href="/admin/export/tableau-de-bord" className="bo-bouton-discret" download>
          {fr.admin.exportPage.telecharger} — tableau-de-bord.csv
        </a>
      </section>

      <section className="bo-panneau">
        <h2 className="mb-3 font-semibold">{fr.admin.exportPage.tables}</h2>
        <ul className="grid gap-2 sm:grid-cols-3">
          {TABLES.map((table) => (
            <li key={table}>
              <a href={`/admin/export/${table}`} className="bo-bouton-discret w-full" download>
                {table}.csv
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
