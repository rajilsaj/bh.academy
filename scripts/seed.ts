import path from 'node:path'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { optionsConnexion } from '../lib/db'
import { envoyerFichier } from '../lib/storage'
import {
  attendance,
  certificates,
  cohorts,
  documents,
  learners,
  outcomes,
  quizAttempts,
  quizQuestions,
  quizzes,
  responses,
  sessions,
  staff,
  waves,
  programModules,
  programs,
  resources,
  trainerProfiles,
  type DocType,
  type OutcomeType,
} from '../lib/db/schema'
import {
  formatLearnerId,
  generateCertificateCode,
  generateDayCode,
  generateLearnerToken,
} from '../lib/ids'

/** Générateur déterministe : deux exécutions produisent le même jeu de démonstration. */
function mulberry32(seed: number) {
  return function random() {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const random = mulberry32(20250829)
const pick = <T,>(items: readonly T[]): T => items[Math.floor(random() * items.length)]

const PRENOMS = [
  'Christian', 'Merveille', 'Grâce', 'Divine', 'Prince', 'Bienvenu', 'Nadège', 'Ornella',
  'Rachel', 'Josué', 'Exaucé', 'Bénédicte', 'Cédric', 'Fresnel', 'Ghislain', 'Naomi',
  'Aimé', 'Sylvie', 'Junior', 'Mireille', 'Brel', 'Chancelle', 'Dieu-Merci', 'Elvis',
  'Farel', 'Gloire', 'Harmonie', 'Israël', 'Jonathan', 'Kévine', 'Lauriane', 'Michée',
  'Nathan', 'Olga', 'Patrick', 'Rosine', 'Steve', 'Thierry', 'Ursule', 'Vanessa',
]

const NOMS = [
  'Mabiala', 'Nkodia', 'Loubaki', 'Bouiti', 'Ngoma', 'Massamba', 'Bakala', 'Ondongo',
  'Moukala', 'Tchicaya', 'Makosso', 'Bissila', 'Ibara', 'Nzaba', 'Okemba', 'Mouyabi',
  'Samba', 'Kimbembe', 'Milandou', 'Ngouala', 'Malonga', 'Ossebi', 'Gampika', 'Ntsiba',
  'Kaya', 'Mavoungou', 'Poaty', 'Batchi', 'Nianga', 'Mankou', 'Obami', 'Ondzé',
  'Tsoumou', 'Yoka', 'Zoniaba', 'Bikindou', 'Bemba', 'Dzon', 'Ekouya', 'Goma',
]

const MODULES = [
  'Découverte de l’IA',
  'Prompts et recherche',
  'Rédiger avec l’IA',
  'Tableurs et données',
  'Présentations et projets',
  'Candidater avec l’IA',
]

const BASELINE_QUESTIONS = [
  {
    prompt: 'Qu’est-ce qu’un « prompt » ?',
    options: [
      'Un message que l’on écrit à une IA pour obtenir une réponse',
      'Un virus informatique',
      'Un type de fichier Excel',
      'Un forfait internet',
    ],
    correctIndex: 0,
  },
  {
    prompt: 'Une IA générative peut-elle se tromper ?',
    options: [
      'Non, elle dit toujours la vérité',
      'Oui, elle peut inventer des informations fausses',
      'Seulement si la connexion est mauvaise',
      'Uniquement en anglais',
    ],
    correctIndex: 1,
  },
  {
    prompt: 'Que faut-il éviter de donner à une IA en ligne ?',
    options: [
      'Le titre d’un livre',
      'Une question de culture générale',
      'Un mot de passe ou un numéro de carte bancaire',
      'Le nom de sa ville',
    ],
    correctIndex: 2,
  },
  {
    prompt: 'Quel outil sert à rédiger un CV avec l’aide de l’IA ?',
    options: [
      'Un traitement de texte associé à un assistant conversationnel',
      'Un tableur uniquement',
      'Un lecteur vidéo',
      'Un antivirus',
    ],
    correctIndex: 0,
  },
  {
    prompt: 'Pourquoi vérifier une information donnée par une IA ?',
    options: [
      'Parce que c’est obligatoire par la loi',
      'Parce qu’elle peut être inexacte ou périmée',
      'Parce que cela consomme moins de données mobiles',
      'Ce n’est pas nécessaire',
    ],
    correctIndex: 1,
  },
]

const ENDLINE_QUESTIONS = [
  {
    prompt: 'Quel prompt donnera le meilleur résultat pour une lettre de motivation ?',
    options: [
      '« Écris une lettre »',
      '« Rédige une lettre de motivation pour un poste d’assistant comptable à Brazzaville, à partir de mon CV ci-dessous, ton professionnel, 250 mots »',
      '« Lettre motivation svp »',
      '« Fais mieux »',
    ],
    correctIndex: 1,
  },
  {
    prompt: 'Comment repérer une information inventée par une IA ?',
    options: [
      'En la recoupant avec une source fiable',
      'En reposant la même question',
      'En changeant de téléphone',
      'C’est impossible',
    ],
    correctIndex: 0,
  },
  {
    prompt: 'Dans un tableur, à quoi sert une formule de somme ?',
    options: [
      'À trier les lignes',
      'À additionner les valeurs d’une plage de cellules',
      'À changer la couleur du texte',
      'À imprimer le document',
    ],
    correctIndex: 1,
  },
  {
    prompt: 'Avant d’envoyer une candidature produite avec l’IA, il faut :',
    options: [
      'L’envoyer telle quelle pour gagner du temps',
      'La traduire en anglais',
      'La relire, la personnaliser et vérifier les faits',
      'La transformer en image',
    ],
    correctIndex: 2,
  },
  {
    prompt: 'Quelle donnée peut-on partager sans risque avec un assistant IA ?',
    options: [
      'Son numéro de pièce d’identité',
      'Le descriptif public d’une offre d’emploi',
      'Le mot de passe de sa messagerie',
      'Ses coordonnées bancaires',
    ],
    correctIndex: 1,
  },
]

const WAVE_LABELS: Record<string, string> = {
  J0: 'J0 — Situation de départ',
  M1: 'M1 — Suivi à 1 mois',
  M2: 'M2 — Suivi à 2 mois',
  M3: 'M3 — Suivi à 3 mois',
  M4: 'M4 — Suivi à 4 mois',
  M5: 'M5 — Suivi à 5 mois',
  M6: 'M6 — Suivi à 6 mois',
}

const DAY = 86_400_000
const today = new Date()
today.setHours(12, 0, 0, 0)
const jour = (offset: number) => new Date(today.getTime() + offset * DAY)
const isoDate = (d: Date) => d.toISOString().slice(0, 10)

/** Quatre profils construits pour que les quatre niveaux apparaissent au tableau de bord. */
type Profil = 'bleu' | 'rouge' | 'orange_vague' | 'orange_assiduite' | 'vert'

const PROFILS: Profil[] = [
  ...Array<Profil>(5).fill('bleu'),
  ...Array<Profil>(5).fill('rouge'),
  ...Array<Profil>(6).fill('orange_vague'),
  ...Array<Profil>(4).fill('orange_assiduite'),
  ...Array<Profil>(20).fill('vert'),
]

export async function runSeed() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL manquant')
  const client = postgres(url, optionsConnexion(url, 1))
  const db = drizzle(client)

  console.log('Nettoyage des tables…')
  await client.unsafe(`
    truncate table notifications, learner_kit, module_decisions, points_ledger, resources,
                   program_modules, programs, trainer_profiles,
                   certificates, outcomes, documents, responses, quiz_attempts, quiz_questions,
                   quizzes, attendance, sessions, waves, learners, staff, cohorts
    restart identity cascade
  `)

  // --- Personnel -----------------------------------------------------------
  const motDePasse = process.env.SEED_PASSWORD ?? 'bantuhub2025'
  const hash = await bcrypt.hash(motDePasse, 10)
  await db.insert(staff).values([
    { email: 'admin@bantuhub.cg', passwordHash: hash, role: 'admin' },
  ])

  // --- Promotion -----------------------------------------------------------
  const [cohort] = await db
    .insert(cohorts)
    .values({
      name: 'Promotion IA 2026 — Brazzaville',
      startsOn: isoDate(jour(-40)),
      endsOn: isoDate(jour(20)),
    })
    .returning()

  // --- Vagues : J0 et M1 fermées, M2 ouverte, le reste à venir -------------
  const waveRows = await db
    .insert(waves)
    .values([
      { code: 'J0', labelFr: WAVE_LABELS.J0, opensAt: jour(-40), closesAt: jour(-35) },
      { code: 'M1', labelFr: WAVE_LABELS.M1, opensAt: jour(-30), closesAt: jour(-5) },
      { code: 'M2', labelFr: WAVE_LABELS.M2, opensAt: jour(-4), closesAt: null },
      { code: 'M3', labelFr: WAVE_LABELS.M3, opensAt: null, closesAt: null },
      { code: 'M4', labelFr: WAVE_LABELS.M4, opensAt: null, closesAt: null },
      { code: 'M5', labelFr: WAVE_LABELS.M5, opensAt: null, closesAt: null },
      { code: 'M6', labelFr: WAVE_LABELS.M6, opensAt: null, closesAt: null },
    ])
    .returning()
  const waveByCode = Object.fromEntries(waveRows.map((w) => [w.code, w]))

  // --- Sessions : cinq déjà passées, la sixième ouverte aujourd'hui ---------
  const sessionOffsets = [-35, -28, -21, -14, -7, 0]
  const sessionRows = await db
    .insert(sessions)
    .values(
      MODULES.map((moduleName, i) => {
        const held = jour(sessionOffsets[i])
        const opens = new Date(held)
        const closes = new Date(held)
        if (sessionOffsets[i] === 0) {
          // La session du jour doit être ouverte à l'instant où l'on sème, quelle
          // que soit l'heure : la fenêtre est calée sur l'heure réelle, pas sur
          // midi, sinon un amorçage matinal ne montrerait aucun code.
          const maintenant = Date.now()
          opens.setTime(maintenant - 2 * 3_600_000)
          closes.setTime(maintenant + 8 * 3_600_000)
        } else {
          opens.setHours(8, 0, 0, 0)
          closes.setHours(18, 0, 0, 0)
        }
        return {
          cohortId: cohort.id,
          moduleName,
          heldOn: isoDate(held),
          dayCode: generateDayCode(),
          opensAt: opens,
          closesAt: closes,
        }
      }),
    )
    .returning()

  // --- Quiz ----------------------------------------------------------------
  const [quizInitial] = await db
    .insert(quizzes)
    .values({ moduleName: MODULES[0], title: 'Quiz initial — Découverte de l’IA', isBaseline: true })
    .returning()
  const [quizFinal] = await db
    .insert(quizzes)
    .values({ moduleName: MODULES[5], title: 'Quiz final — Candidater avec l’IA', isBaseline: false })
    .returning()

  await db.insert(quizQuestions).values([
    ...BASELINE_QUESTIONS.map((q, i) => ({ quizId: quizInitial.id, position: i + 1, ...q })),
    ...ENDLINE_QUESTIONS.map((q, i) => ({ quizId: quizFinal.id, position: i + 1, ...q })),
  ])

  // --- Apprenants ----------------------------------------------------------
  const learnerRows = PROFILS.map((profil, i) => {
    const prenom = PRENOMS[i % PRENOMS.length]
    const nom = NOMS[(i * 7 + 3) % NOMS.length]
    const prefixe = random() < 0.6 ? '06' : '05'
    const phone = `+242 ${prefixe} ${100 + Math.floor(random() * 900)} ${
      10 + Math.floor(random() * 90)
    } ${10 + Math.floor(random() * 90)}`
    return {
      row: {
        id: formatLearnerId(i + 1),
        cohortId: cohort.id,
        fullName: `${prenom} ${nom}`,
        phone,
        email: random() < 0.5 ? `${prenom.toLowerCase().replace(/[^a-z]/g, '')}.${nom.toLowerCase().replace(/[^a-z]/g, '')}@example.cg` : null,
        token: generateLearnerToken(),
        consentCommunity: random() < 0.85,
        consentData: true,
        createdAt: jour(-40 + Math.floor(random() * 3)),
      },
      profil,
    }
  })
  await db.insert(learners).values(learnerRows.map((l) => l.row))

  // --- Présences : trous d'assiduité selon le profil -----------------------
  const presenceRows: { learnerId: string; sessionId: string; checkedInAt: Date }[] = []
  learnerRows.forEach(({ row, profil }, i) => {
    // Index des sessions manquées. Choisis (et non tirés au hasard) pour que la
    // démonstration produise exactement les quatre niveaux attendus :
    //   rouge            1/6 de présence + série de 5 absences consécutives
    //   orange_assiduite 3/6 = 50 %, sous le seuil de 70 %
    //   les autres       5/6 ou 6/6, au-dessus du seuil
    // L'index 5 est la session du jour, encore ouverte : une partie de la
    // promotion ne s'est donc pas encore pointée, ce qui alimente la relance.
    let absentes: number[]
    if (profil === 'rouge') absentes = [1, 2, 3, 4, 5]
    else if (profil === 'orange_assiduite') absentes = [2, 3, 5]
    else if (profil === 'bleu') absentes = []
    else if (profil === 'orange_vague') absentes = [5]
    else absentes = i % 3 === 0 ? [] : [5]

    sessionRows.forEach((seance, index) => {
      if (absentes.includes(index)) return
      // On pointe dans la première heure qui suit l'ouverture : toujours dans la
      // fenêtre de la session, et jamais dans le futur pour la session du jour.
      const held = new Date(seance.opensAt.getTime() + Math.floor(random() * 60) * 60_000)
      presenceRows.push({ learnerId: row.id, sessionId: seance.id, checkedInAt: held })
    })
  })
  await db.insert(attendance).values(presenceRows)

  // --- Réponses aux vagues -------------------------------------------------
  const STATUTS = ['etudiant', 'sans_emploi', 'emploi_informel', 'emploi_formel', 'independant', 'stage']
  const OUTILS = ['aucun', 'chatgpt', 'gemini', 'copilot', 'claude', 'meta_ai', 'traducteur']
  const USAGES = ['jamais', 'rarement', 'hebdo', 'quotidien']
  const REVENUS = ['aucun', 'ponctuel', 'regulier']
  const OBSTACLES = ['connexion', 'materiel', 'temps', 'competence', 'opportunite', 'aucun']

  const responseRows: {
    learnerId: string
    waveId: string
    payload: Record<string, unknown>
    submittedAt: Date
  }[] = []

  learnerRows.forEach(({ row, profil }, i) => {
    const repondJ0 = profil !== 'rouge'
    const repondM1 = profil === 'vert' || profil === 'bleu' || profil === 'orange_assiduite'
    // Une minorité a déjà répondu à M2 : les autres basculeront en Orange à sa fermeture.
    const repondM2 = (profil === 'vert' && i % 3 === 0) || profil === 'bleu'

    if (repondJ0) {
      responseRows.push({
        learnerId: row.id,
        waveId: waveByCode.J0.id,
        payload: {
          situation: pick(STATUTS),
          outils_ia: random() < 0.5 ? ['aucun'] : [pick(OUTILS), pick(OUTILS)],
          confiance: 1 + Math.floor(random() * 3),
          objectif: 'Trouver un emploi ou une mission en utilisant les outils numériques.',
        },
        submittedAt: jour(-39 + Math.floor(random() * 3)),
      })
    }
    if (repondM1) {
      responseRows.push({
        learnerId: row.id,
        waveId: waveByCode.M1.id,
        payload: {
          situation: pick(STATUTS),
          usage_ia: pick(USAGES),
          confiance: 2 + Math.floor(random() * 4),
          candidatures: Math.floor(random() * 6),
          entretiens: Math.floor(random() * 3),
          revenu: pick(REVENUS),
          outil_principal: pick(OUTILS),
          obstacle: pick(OBSTACLES),
          besoin: 'Un accompagnement pour les candidatures.',
        },
        submittedAt: jour(-20 + Math.floor(random() * 10)),
      })
    }
    if (repondM2) {
      responseRows.push({
        learnerId: row.id,
        waveId: waveByCode.M2.id,
        payload: {
          situation: pick(STATUTS),
          usage_ia: pick(USAGES.slice(1)),
          confiance: 3 + Math.floor(random() * 3),
          candidatures: 1 + Math.floor(random() * 8),
          entretiens: Math.floor(random() * 4),
          revenu: pick(REVENUS),
          outil_principal: pick(OUTILS.slice(1)),
          obstacle: pick(OBSTACLES),
          besoin: 'Des offres à jour.',
        },
        submittedAt: jour(-3 + Math.floor(random() * 3)),
      })
    }
  })
  await db.insert(responses).values(responseRows)

  // --- Tentatives de quiz --------------------------------------------------
  const attemptRows: {
    learnerId: string
    quizId: string
    score: number
    maxScore: number
    answers: Record<string, number>
    submittedAt: Date
  }[] = []

  const answersFor = (questions: typeof BASELINE_QUESTIONS, score: number) => {
    const answers: Record<string, number> = {}
    questions.forEach((q, i) => {
      const juste = i < score
      answers[String(i + 1)] = juste
        ? q.correctIndex
        : (q.correctIndex + 1 + Math.floor(random() * 3)) % q.options.length
    })
    return answers
  }

  for (const { row, profil } of learnerRows) {
    if (profil === 'rouge') continue // aucun quiz : c'est le signal de décrochage

    const scoreInitial = 1 + Math.floor(random() * 3)
    attemptRows.push({
      learnerId: row.id,
      quizId: quizInitial.id,
      score: scoreInitial,
      maxScore: BASELINE_QUESTIONS.length,
      answers: answersFor(BASELINE_QUESTIONS, scoreInitial),
      submittedAt: jour(-35),
    })

    // Le quiz final n'est passé que par ceux qui étaient là à la dernière session.
    if (profil === 'orange_vague') continue
    if (profil === 'orange_assiduite' && random() < 0.5) continue

    const scoreFinal = Math.min(5, scoreInitial + 1 + Math.floor(random() * 3))
    attemptRows.push({
      learnerId: row.id,
      quizId: quizFinal.id,
      score: scoreFinal,
      maxScore: ENDLINE_QUESTIONS.length,
      answers: answersFor(ENDLINE_QUESTIONS, scoreFinal),
      submittedAt: jour(-1),
    })
  }
  await db.insert(quizAttempts).values(attemptRows)

  // --- Documents : le CV existe en v1 (inscription) et v2 (après le module) -
  const documentRows: {
    learnerId: string
    docType: DocType
    version: number
    path: string
    uploadedAt: Date
  }[] = []

  for (const { row, profil } of learnerRows) {
    if (profil === 'rouge') continue

    const versions: { type: DocType; version: number; offset: number }[] = [
      { type: 'cv', version: 1, offset: -38 },
    ]
    if (profil !== 'orange_vague') versions.push({ type: 'cv', version: 2, offset: -6 })
    if (profil === 'bleu' || profil === 'vert') versions.push({ type: 'lettre', version: 1, offset: -4 })
    if (profil === 'bleu') versions.push({ type: 'projet', version: 1, offset: -2 })
    if (random() < 0.3) versions.push({ type: 'excel', version: 1, offset: -9 })

    for (const doc of versions) {
      const relative = path.posix.join(row.id, `${doc.type}-v${doc.version}-seed.txt`)
      await envoyerFichier(
        relative,
        Buffer.from(`Document de démonstration — ${row.fullName} — ${doc.type} version ${doc.version}\n`, 'utf8'),
        'text/plain; charset=utf-8',
      )
      documentRows.push({
        learnerId: row.id,
        docType: doc.type,
        version: doc.version,
        path: relative,
        uploadedAt: jour(doc.offset),
      })
    }
  }
  await db.insert(documents).values(documentRows)

  // --- Résultats : journal d'événements, jamais un statut ------------------
  const outcomeRows: {
    learnerId: string
    outcomeType: OutcomeType
    occurredOn: string
    detail: string
  }[] = []

  const POSITIFS: OutcomeType[] = ['emploi', 'stage', 'mission', 'projet']
  learnerRows.forEach(({ row, profil }, i) => {
    if (profil === 'bleu') {
      const type = POSITIFS[i % POSITIFS.length]
      outcomeRows.push({
        learnerId: row.id,
        outcomeType: 'candidature',
        occurredOn: isoDate(jour(-18)),
        detail: 'Candidature spontanée rédigée avec l’IA',
      })
      outcomeRows.push({
        learnerId: row.id,
        outcomeType: 'entretien',
        occurredOn: isoDate(jour(-10)),
        detail: 'Entretien préparé en atelier',
      })
      outcomeRows.push({
        learnerId: row.id,
        outcomeType: type,
        occurredOn: isoDate(jour(-3)),
        detail:
          type === 'emploi'
            ? 'Poste d’assistant administratif, Brazzaville'
            : type === 'stage'
              ? 'Stage de trois mois en communication'
              : type === 'mission'
                ? 'Mission de saisie de données pour une PME'
                : 'Lancement d’une activité de rédaction assistée',
      })
    } else if (profil !== 'rouge' && random() < 0.35) {
      // Candidatures et entretiens seuls : activité réelle, sans insertion encore.
      outcomeRows.push({
        learnerId: row.id,
        outcomeType: random() < 0.7 ? 'candidature' : 'entretien',
        occurredOn: isoDate(jour(-Math.floor(random() * 20) - 1)),
        detail: 'Suivi déclaré lors du questionnaire mensuel',
      })
    }
  })
  await db.insert(outcomes).values(outcomeRows)

  // --- Certificats ---------------------------------------------------------
  // On en délivre une partie seulement : le back-office doit montrer à la fois
  // des certificats remis et une file d'apprenants éligibles en attente.
  const eligibles = await client<{ learner_id: string; avancement: string }[]>`
    select learner_id, avancement from v_certificate_eligibility
    where eligible and not deja_delivre
    order by avancement desc
  `
  const aDelivrer = eligibles.slice(0, Math.ceil(eligibles.length * 0.6))
  const annee = new Date().getFullYear()
  if (aDelivrer.length > 0) {
    const [directeur] = await db.select().from(staff).where(eq(staff.role, 'admin')).limit(1)
    await db.insert(certificates).values(
      aDelivrer.map((e, i) => ({
        learnerId: e.learner_id,
        code: generateCertificateCode(annee),
        title: 'Littératie en intelligence artificielle',
        progressPct: e.avancement,
        issuedOn: isoDate(jour(-2 - (i % 5))),
        issuedBy: directeur?.id ?? null,
      })),
    )
  }

  // --- Récapitulatif -------------------------------------------------------
  const niveaux = await client<{ level: string; n: number }[]>`
    select level, count(*)::int as n from v_learner_level group by level order by level
  `
  console.log('')
  console.log(`Promotion       : ${cohort.name} (${cohort.id})`)
  console.log(`Apprenants      : ${learnerRows.length}`)
  console.log(`Sessions         : ${sessionRows.length}`)
  console.log(`Présences       : ${presenceRows.length}`)
  console.log(`Réponses        : ${responseRows.length}`)
  console.log(`Tentatives quiz : ${attemptRows.length}`)
  console.log(`Documents       : ${documentRows.length}`)
  console.log(`Résultats       : ${outcomeRows.length}`)
  console.log(`Certificats     : ${aDelivrer.length} délivrés, ${eligibles.length - aDelivrer.length} en attente`)
  console.log('')
  console.log('Répartition des niveaux :')
  for (const n of niveaux) console.log(`  ${n.level.padEnd(7)} ${n.n}`)
  console.log('')
  console.log(`Inscription     : /inscription/${cohort.id}`)
  console.log(`Code du jour    : ${sessionRows[sessionRows.length - 1].dayCode} (session ouverte)`)
  console.log(`Exemple de lien : /l/${learnerRows[0].row.token}`)
  console.log('')
  console.log('Comptes du personnel (mot de passe identique) :')
  console.log('  admin@bantuhub.cg (administrateur)')
  console.log(`  mot de passe : ${motDePasse}`)

  // --- BantuLab : formation, modules, formateur, ressources, points ---------
  await semerBantuLab(db, client, cohort.id, hash)

  await client.end()
}

/**
 * La formation de démonstration : les six modules des sessions, pondérés, un
 * formateur confirmé, deux ressources par module, et les points déjà acquis
 * recalculés depuis les présences et les quiz existants.
 */
export async function semerBantuLab(
  db: ReturnType<typeof drizzle>,
  client: ReturnType<typeof postgres>,
  cohortId: string,
  hash: string,
) {
  const [formateur] = await db
    .insert(staff)
    .values({ email: 'formateur@bantuhub.cg', passwordHash: hash, role: 'formateur' })
    .returning()
  await db.insert(trainerProfiles).values({
    staffId: formateur.id,
    fullName: 'Aimé Loubaki',
    bio: 'Formateur IA & bureautique, IALab by BantuHub.',
    phone: '+242 06 000 00 00',
    linkedin: 'https://www.linkedin.com/in/aime-loubaki',
    website: 'https://bantuhub.com',
    confirmedAt: new Date(),
  })

  const [formation] = await db
    .insert(programs)
    .values({
      name: 'Formation à l’intelligence artificielle au service de l’employabilité des jeunes',
      description:
        'Cinq semaines pour apprendre à travailler avec l’IA : découverte, prompt engineering, bureautique.',
      startsOn: '2026-10-01',
      endsOn: '2026-11-05',
      schedule: 'Une session par semaine, en présentiel',
      expectedLearners: 1000,
      expectations: 'Des jeunes capables d’utiliser ChatGPT, Claude et Gemini dans un cadre professionnel.',
      partner: 'FONEA',
      goalChecklist: [
        'Former 1 000 jeunes de Brazzaville et Pointe-Noire aux usages professionnels de l’IA.',
        'Atteindre au moins 80 % de présence à chaque session.',
        'Valider chaque module à 70 % des points au minimum.',
        'Délivrer un certificat aux apprenants ayant complété la formation.',
      ],
    })
    .returning()
  await db.update(cohorts).set({ programId: formation.id }).where(eq(cohorts.id, cohortId))

  const moduleRows = await db
    .insert(programModules)
    .values(
      MODULES.map((title, i) => ({
        programId: formation.id,
        position: i + 1,
        title,
        durationHours: '3.0',
        pointsTotal: 50,
        pointsPresence: 15,
        pointsRessource: 5,
        pointsQuiz: 25,
        weight: i === 0 ? 1 : 2,
        passThresholdPct: 70,
        trainerId: formateur.id,
      })),
    )
    .returning()

  await db.insert(resources).values(
    moduleRows.flatMap((m) => [
      {
        moduleId: m.id,
        trainerId: formateur.id,
        kind: 'presentation' as const,
        title: `Support — ${m.title}`,
        url: 'https://bantuhub.com',
        points: 5,
      },
      {
        moduleId: m.id,
        trainerId: formateur.id,
        kind: 'quiz' as const,
        title: `Kahoot — ${m.title}`,
        url: 'https://kahoot.it',
        points: 5,
      },
    ]),
  )

  // Points déjà acquis : une ligne par présence et par quiz existants.
  await client.unsafe(`
    insert into points_ledger (learner_id, module_id, source, ref_id, points)
    select a.learner_id, m.id, 'presence', s.id::text, m.points_presence
    from attendance a
    join sessions s on s.id = a.session_id
    join program_modules m on m.title = s.module_name and m.program_id = '${formation.id}'
    on conflict do nothing
  `)
  await client.unsafe(`
    insert into points_ledger (learner_id, module_id, source, ref_id, points)
    select qa.learner_id, m.id, 'quiz', q.id::text,
           round(m.points_quiz * qa.score::numeric / nullif(qa.max_score, 0))::int
    from quiz_attempts qa
    join quizzes q on q.id = qa.quiz_id
    join program_modules m on m.title = q.module_name and m.program_id = '${formation.id}'
    on conflict do nothing
  `)
}
