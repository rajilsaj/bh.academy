import { asc, eq } from 'drizzle-orm'
import { Alerte, Bloc, LearnerShell, LienInvalide, Succes } from '@/components/LearnerShell'
import { db } from '@/lib/db'
import { documents, DOC_TYPES } from '@/lib/db/schema'
import { fr } from '@/lib/i18n/fr'
import { formatDate } from '@/lib/format'
import { getLearnerByToken } from '@/lib/queries'
import { envoyerDocument } from './actions'

export const dynamic = 'force-dynamic'

const MESSAGES: Record<string, string> = {
  fichier: fr.learner.documents.erreurFichier,
  format: fr.learner.documents.erreurFormat,
  type: fr.inscription.champManquant,
}

export default async function DocumentsPage({
  params,
  searchParams,
}: {
  params: { token: string }
  searchParams: { e?: string; ok?: string }
}) {
  const learner = await getLearnerByToken(params.token)
  if (!learner) return <LienInvalide />

  const base = `/l/${learner.token}`
  const mes = await db
    .select()
    .from(documents)
    .where(eq(documents.learnerId, learner.id))
    .orderBy(asc(documents.docType), asc(documents.version))

  const erreur = searchParams.e ? MESSAGES[searchParams.e] : null

  return (
    <LearnerShell title={fr.learner.documents.titre} backHref={base}>
      {erreur ? <Alerte>{erreur}</Alerte> : null}
      {searchParams.ok ? (
        <Succes>
          {fr.learner.documents.succesDetail} {searchParams.ok}.
        </Succes>
      ) : null}

      <Bloc>
        <form action={envoyerDocument} encType="multipart/form-data" className="space-y-4">
          <input type="hidden" name="token" value={learner.token} />

          <div>
            <label className="etiquette" htmlFor="docType">
              {fr.learner.documents.choisirType}
            </label>
            <select id="docType" name="docType" required className="champ" defaultValue="cv">
              {DOC_TYPES.map((type) => (
                <option key={type} value={type}>
                  {fr.docTypes[type]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="etiquette" htmlFor="fichier">
              {fr.learner.documents.fichier}
            </label>
            <input id="fichier" name="fichier" type="file" required className="champ" />
            <p className="mt-2 text-sm text-slate-600">{fr.learner.documents.aide}</p>
          </div>

          <button type="submit" className="bouton-principal">
            {fr.app.envoyer}
            <span className="fleche" aria-hidden="true">
              ↗
            </span>
          </button>
        </form>
      </Bloc>

      {mes.length > 0 ? (
        <section className="mt-5">
          <h2 className="mb-2 font-semibold text-white">{fr.learner.documents.vosDocuments}</h2>
          <ul className="space-y-2">
            {mes.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-3 rounded-bloc border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
              >
                <span>
                  {fr.docTypes[doc.docType]}
                  <span className="ml-2 rounded-full bg-vitrine-jaune px-2 py-0.5 text-xs font-bold text-vitrine-violet-fonce">
                    v{doc.version}
                  </span>
                </span>
                <span className="text-white/60">{formatDate(doc.uploadedAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </LearnerShell>
  )
}
