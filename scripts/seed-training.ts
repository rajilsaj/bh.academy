/**
 * Seed script for training management data
 * Creates sample trainers, modules, sessions, and affectations
 */

import { db } from '../lib/db'
import { trainers, modules, sessions, affectations } from '../lib/db/schema'

const CITIES = ['Brazzaville', 'Pointe-Noire']

const SKILLS = [
  'Python',
  'JavaScript',
  'TypeScript',
  'React',
  'Vue',
  'Node.js',
  'PostgreSQL',
  'MongoDB',
  'Docker',
  'Kubernetes',
  'AWS',
  'GCP',
]

const TRAINER_DATA = [
  {
    email: 'alice.johnson@bantuhub.cg',
    fullName: 'Alice Johnson',
    phone: '+243 812 345 678',
    city: 'Brazzaville',
    skills: ['Python', 'PostgreSQL', 'Docker'],
    availabilityWindows: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
    ],
  },
  {
    email: 'bob.smith@bantuhub.cg',
    fullName: 'Bob Smith',
    phone: '+243 813 456 789',
    city: 'Pointe-Noire',
    skills: ['JavaScript', 'React', 'Node.js'],
    availabilityWindows: [
      { dayOfWeek: 2, startTime: '14:00', endTime: '18:00' },
      { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
    ],
  },
  {
    email: 'charlie.brown@bantuhub.cg',
    fullName: 'Charlie Brown',
    phone: '+243 814 567 890',
    city: 'Brazzaville',
    skills: ['TypeScript', 'Vue', 'MongoDB'],
    availabilityWindows: [
      { dayOfWeek: 1, startTime: '10:00', endTime: '16:00' },
      { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
    ],
  },
  {
    email: 'diana.williams@bantuhub.cg',
    fullName: 'Diana Williams',
    phone: '+243 815 678 901',
    city: 'Brazzaville',
    skills: ['Kubernetes', 'AWS', 'Docker', 'Python'],
    availabilityWindows: [
      { dayOfWeek: 1, startTime: '14:00', endTime: '18:00' },
      { dayOfWeek: 3, startTime: '14:00', endTime: '18:00' },
      { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
    ],
  },
  {
    email: 'evan.davis@bantuhub.cg',
    fullName: 'Evan Davis',
    phone: '+243 816 789 012',
    city: 'Pointe-Noire',
    skills: ['GCP', 'PostgreSQL', 'JavaScript'],
    availabilityWindows: [
      { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 4, startTime: '14:00', endTime: '18:00' },
      { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
    ],
  },
]

const MODULE_DATA = [
  {
    code: 'PYTHON-101',
    title: 'Introduction to Python',
    durationHours: 40,
    description: 'Learn Python basics: variables, functions, classes',
    maxLearners: 20,
    requiredSkills: [],
  },
  {
    code: 'PYTHON-201',
    title: 'Advanced Python',
    durationHours: 40,
    description: 'Advanced Python: decorators, generators, async',
    maxLearners: 15,
    requiredSkills: ['Python'],
  },
  {
    code: 'REACT-101',
    title: 'React Fundamentals',
    durationHours: 30,
    description: 'Learn React: components, hooks, state management',
    maxLearners: 18,
    requiredSkills: ['JavaScript'],
  },
  {
    code: 'FULLSTACK-201',
    title: 'Full Stack Development',
    durationHours: 60,
    description: 'Full stack: Node.js, React, PostgreSQL',
    maxLearners: 12,
    requiredSkills: ['JavaScript', 'Node.js', 'PostgreSQL'],
  },
  {
    code: 'DEVOPS-101',
    title: 'Docker & Kubernetes Basics',
    durationHours: 35,
    description: 'Containerization and orchestration',
    maxLearners: 15,
    requiredSkills: ['Docker'],
  },
  {
    code: 'CLOUD-101',
    title: 'AWS Fundamentals',
    durationHours: 40,
    description: 'Cloud computing with AWS',
    maxLearners: 16,
    requiredSkills: [],
  },
]

async function seed() {
  try {
    console.log('🌱 Seeding training data...\n')

    // Create trainers
    console.log('📚 Creating trainers...')
    const createdTrainers = []
    for (const trainerData of TRAINER_DATA) {
      const [trainer] = await db
        .insert(trainers)
        .values({
          externalRef: null,
          email: trainerData.email,
          fullName: trainerData.fullName,
          phone: trainerData.phone,
          city: trainerData.city,
          skills: trainerData.skills,
          availabilityWindows: trainerData.availabilityWindows as any,
          status: 'actif',
          site: 'HQ',
          source: 'manuel',
          importRunId: null,
          importedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()

      createdTrainers.push(trainer)
      console.log(`  ✓ ${trainer.fullName}`)
    }

    // Create modules
    console.log('\n📖 Creating modules...')
    const createdModules = []
    for (const moduleData of MODULE_DATA) {
      const [module] = await db
        .insert(modules)
        .values({
          code: moduleData.code,
          title: moduleData.title,
          durationHours: moduleData.durationHours,
          description: moduleData.description,
          maxLearners: moduleData.maxLearners,
          requiredSkills: moduleData.requiredSkills,
          prerequisites: [],
          programId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()

      createdModules.push(module)
      console.log(`  ✓ ${module.title} (${module.code})`)
    }

    // Create sessions (2 weeks from now)
    console.log('\n📅 Creating sessions...')
    const now = new Date()
    const in2Weeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    const in3Weeks = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000)

    const createdSessions = []
    for (let i = 0; i < Math.min(3, createdModules.length); i++) {
      const sessionStart = new Date(in2Weeks.getTime() + i * 7 * 24 * 60 * 60 * 1000)
      const sessionEnd = new Date(sessionStart.getTime() + 5 * 24 * 60 * 60 * 1000)

      const [session] = await db
        .insert(sessions)
        .values({
          moduleId: createdModules[i].id,
          opensAt: sessionStart,
          closesAt: sessionEnd,
          status: 'planifiée',
          roomLocation: i % 2 === 0 ? 'Room A - Brazzaville' : 'Room B - Pointe-Noire',
          canceledReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()

      createdSessions.push(session)
      console.log(`  ✓ ${createdModules[i].title} (${sessionStart.toLocaleDateString()})`)
    }

    // Create affectations (assign trainers to sessions)
    console.log('\n🎯 Creating affectations...')
    let affectationCount = 0

    for (const session of createdSessions) {
      // Assign 1-2 trainers per session
      const trainersPerSession = Math.floor(Math.random() * 2) + 1
      const selectedTrainers = createdTrainers.slice(0, trainersPerSession)

      for (let i = 0; i < selectedTrainers.length; i++) {
        const role = i === 0 ? 'titulaire' : 'suppléant'

        await db
          .insert(affectations)
          .values({
            sessionId: session.id,
            trainerId: selectedTrainers[i].id,
            role,
            status: 'proposé',
            statusHistory: [
              {
                status: 'proposé',
                timestamp: new Date().toISOString(),
                changedBy: 'seed-script',
              },
            ],
            conflictReason: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            confirmedAt: null,
            refusedAt: null,
          })
          .returning()

        affectationCount++
        console.log(`  ✓ ${selectedTrainers[i].fullName} as ${role} for ${session.id}`)
      }
    }

    console.log('\n✅ Seed completed successfully!')
    console.log(`   - ${createdTrainers.length} trainers created`)
    console.log(`   - ${createdModules.length} modules created`)
    console.log(`   - ${createdSessions.length} sessions created`)
    console.log(`   - ${affectationCount} affectations created`)
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  }
}

seed()
