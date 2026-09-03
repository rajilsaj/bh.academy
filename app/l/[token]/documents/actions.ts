'use server'

import { redirect } from 'next/navigation'
import { sql as raw } from 'drizzle-orm'
import { db } from '@/lib/db'
import { documents, DOC_TYPES, type DocType } from '@/lib/db/schema'
import { getLearnerByToken } from '@/lib/queries'
import { MAX_UPLOAD_BYTES, isAllowedFilename, storeUpload } from '@/lib/uploads'

export async function envoyerDocument(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  const docType = String(formData.get('docType') ?? '') as DocType
  const file = formData.get('fichier')

  const learner = await getLearnerByToken(token)
  if (!learner) redirect('/')

  const base = `/l/${learner.token}/documents`
  function back(query: string): never {
    redirect(query ? `${base}?${query}` : base)
  }

  if (!DOC_TYPES.includes(docType)) back('e=type')
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_UPLOAD_BYTES) back('e=fichier')
  if (!isAllowedFilename(file.name)) back('e=format')

  const bytes = Buffer.from(await file.arrayBuffer())

  // Une nouvelle version à chaque envoi : le CV v1 de l'inscription doit survivre
  // au CV v2 produit après le module IA. On n'écrase jamais.
  const [{ next }] = await db.execute<{ next: number }>(raw`
    select coalesce(max(version), 0) + 1 as next
    from documents
    where learner_id = ${learner.id} and doc_type = ${docType}
  `)
  const version = Number(next)

  const path = await storeUpload({
    learnerId: learner.id,
    docType,
    version,
    originalName: file.name,
    bytes,
  })

  await db.insert(documents).values({ learnerId: learner.id, docType, version, path })

  back(`ok=${version}`)
}
