import { z } from 'zod'

/**
 * Le formulaire d'inscription, décrit une seule fois pour les deux côtés :
 * le navigateur valide chaque étape avant de passer à la suivante, le serveur
 * revalide tout avant d'écrire. Les messages sont des **codes** (`requis`,
 * `telephone`…) traduits par l'appelant : ce module ne charge pas `fr.ts`,
 * qui n'a rien à faire dans le bundle client.
 */

export const STATUTS = ['etudiant', 'sans_emploi', 'emploi_informel', 'emploi_formel', 'independant', 'stage'] as const
export const OUTILS = ['aucun', 'chatgpt', 'gemini', 'copilot', 'claude', 'deepseek', 'meta_ai', 'traducteur', 'autre'] as const
export type Statut = (typeof STATUTS)[number]
export type Outil = (typeof OUTILS)[number]

export const ETAPES = ['identite', 'situation', 'consentements'] as const
export type EtapeCle = (typeof ETAPES)[number]

export type CodeErreur = 'requis' | 'trop_long' | 'telephone' | 'email' | 'consent'

/** 9 chiffres locaux ou un format international ; vide = non renseigné. */
const telephone = z
  .string()
  .trim()
  .max(30, 'trop_long')
  .refine((v) => v === '' || /^\d{9,15}$/.test(v.replace(/\D/g, '')), 'telephone')

const requis = { errorMap: () => ({ message: 'requis' }) }

export const schemasEtapes = {
  identite: z.object({
    fullName: z.string().trim().min(1, 'requis').max(120, 'trop_long'),
    phone: telephone,
    email: z.union([z.literal(''), z.string().trim().max(160, 'trop_long').email('email')]),
  }),
  situation: z.object({
    statut: z.enum(STATUTS, requis),
    outils: z.array(z.enum(OUTILS)),
    confiance: z.coerce.number().int().min(1, 'requis').max(5, 'requis'),
    objectif: z.string().trim().min(1, 'requis').max(500, 'trop_long'),
  }),
  consentements: z.object({
    consentCommunity: z.boolean(),
    consentData: z.literal(true, { errorMap: () => ({ message: 'consent' }) }),
  }),
} satisfies Record<EtapeCle, z.ZodTypeAny>

export const schemaInscription = schemasEtapes.identite
  .merge(schemasEtapes.situation)
  .merge(schemasEtapes.consentements)

export type Inscription = z.infer<typeof schemaInscription>
export type ChampInscription = keyof Inscription

/** Les valeurs brutes d'un `FormData`, telles que les schémas les attendent. */
export function lireFormData(fd: FormData) {
  const texte = (nom: string) => String(fd.get(nom) ?? '')
  return {
    fullName: texte('fullName'),
    phone: texte('phone'),
    email: texte('email'),
    statut: texte('statut'),
    outils: fd.getAll('outils').map(String),
    confiance: texte('confiance'),
    objectif: texte('objectif'),
    consentCommunity: fd.get('consentCommunity') === 'on',
    consentData: fd.get('consentData') === 'on',
  }
}

export type ResultatEtape =
  | { ok: true }
  | { ok: false; erreurs: Partial<Record<ChampInscription, CodeErreur>> }

/** Valide une étape ; une seule erreur par champ, la première rencontrée. */
export function validerEtape(etape: EtapeCle, fd: FormData): ResultatEtape {
  const resultat = schemasEtapes[etape].safeParse(lireFormData(fd))
  if (resultat.success) return { ok: true }
  const erreurs: Partial<Record<ChampInscription, CodeErreur>> = {}
  for (const issue of resultat.error.issues) {
    const champ = issue.path[0] as ChampInscription | undefined
    if (champ && !erreurs[champ]) erreurs[champ] = issue.message as CodeErreur
  }
  return { ok: false, erreurs }
}
