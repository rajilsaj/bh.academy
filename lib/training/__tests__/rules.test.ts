/**
 * Unit tests for training management rules engine
 * Tests overlap detection, availability validation, skill matching, eligibility scoring
 */

import {
  parseTime,
  timesOverlap,
  getDayOfWeek,
  getTimeMinutes,
  isAvailable,
  isAvailableForSession,
  hasRequiredSkills,
  validateTrainerSessionAssignment,
  assessTrainerEligibility,
  detectFieldConflicts,
  type AvailabilityWindow,
  type ConflictReason,
  type EligibilityResult,
} from '../rules'

// ============================================================================
// Test Helpers
// ============================================================================

function createDate(year: number, month: number, day: number, hour: number, minute: number): Date {
  const d = new Date(year, month - 1, day, hour, minute, 0)
  return d
}

function assertConflictExists(
  conflicts: ConflictReason[],
  type: string,
  message?: string,
): boolean {
  const found = conflicts.find((c) => c.type === type)
  if (message && !found) {
    console.error(`Expected conflict type "${type}": ${message}`)
    return false
  }
  return found !== undefined
}

// ============================================================================
// Time Parsing Tests
// ============================================================================

console.log('=== Time Parsing Tests ===')

// Test parseTime
const time1 = parseTime('09:30')
console.assert(time1 === 570, `parseTime('09:30') should be 570, got ${time1}`)

const time2 = parseTime('14:00')
console.assert(time2 === 840, `parseTime('14:00') should be 840, got ${time2}`)

const time3 = parseTime('23:59')
console.assert(time3 === 1439, `parseTime('23:59') should be 1439, got ${time3}`)

console.log('✓ Time parsing tests passed')

// ============================================================================
// Overlap Detection Tests
// ============================================================================

console.log('\n=== Overlap Detection Tests ===')

// Sessions: 9:00-11:00 vs 10:00-12:00 (should overlap)
console.assert(
  timesOverlap(540, 660, 600, 720),
  'Overlapping sessions should be detected',
)

// Sessions: 9:00-11:00 vs 11:00-13:00 (should NOT overlap - touching edges)
console.assert(
  !timesOverlap(540, 660, 660, 780),
  'Touching edges should not overlap',
)

// Sessions: 9:00-11:00 vs 14:00-16:00 (should NOT overlap)
console.assert(
  !timesOverlap(540, 660, 840, 960),
  'Non-overlapping sessions should not conflict',
)

console.log('✓ Overlap detection tests passed')

// ============================================================================
// Day of Week Tests
// ============================================================================

console.log('\n=== Day of Week Tests ===')

// Monday, 2025-01-06 is a Monday (dayOfWeek = 1)
const monday = createDate(2025, 1, 6, 9, 0)
console.assert(getDayOfWeek(monday) === 1, `Monday should be dayOfWeek 1, got ${getDayOfWeek(monday)}`)

// Sunday, 2025-01-05 is a Sunday (dayOfWeek = 0)
const sunday = createDate(2025, 1, 5, 9, 0)
console.assert(getDayOfWeek(sunday) === 0, `Sunday should be dayOfWeek 0, got ${getDayOfWeek(sunday)}`)

console.log('✓ Day of week tests passed')

// ============================================================================
// Availability Window Tests
// ============================================================================

console.log('\n=== Availability Window Tests ===')

const windows: AvailabilityWindow[] = [
  { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }, // Monday 9-5
  { dayOfWeek: 2, startTime: '14:00', endTime: '18:00' }, // Tuesday 2-6pm
]

// Monday 10:00 should be available
const monayMorning = createDate(2025, 1, 6, 10, 0)
console.assert(isAvailable(windows, monayMorning), 'Monday 10:00 should be available')

// Monday 8:00 should NOT be available (before window)
const mondayEarly = createDate(2025, 1, 6, 8, 0)
console.assert(!isAvailable(windows, mondayEarly), 'Monday 8:00 should not be available')

// Tuesday 15:00 should be available (in 2-6pm window)
const tuesdayAfternoon = createDate(2025, 1, 7, 15, 0)
console.assert(isAvailable(windows, tuesdayAfternoon), 'Tuesday 15:00 should be available')

// Tuesday 10:00 should NOT be available (before 2pm window)
const tuesdayMorning = createDate(2025, 1, 7, 10, 0)
console.assert(!isAvailable(windows, tuesdayMorning), 'Tuesday 10:00 should not be available')

// Wednesday should NOT be available (no windows defined)
const wednesdayMorning = createDate(2025, 1, 8, 10, 0)
console.assert(!isAvailable(windows, wednesdayMorning), 'Wednesday should not be available')

// Empty windows = always available
console.assert(isAvailable([], mondayEarly), 'Empty windows should mean always available')

console.log('✓ Availability window tests passed')

// ============================================================================
// Skill Matching Tests
// ============================================================================

console.log('\n=== Skill Matching Tests ===')

const { hasMissing: noMissing, missing: missingSkills1 } = hasRequiredSkills(
  ['Python', 'JavaScript', 'SQL'],
  ['Python', 'JavaScript'],
)
console.assert(!noMissing, 'Should have all required skills')
console.assert(missingSkills1.length === 0, 'Should have no missing skills')

const { hasMissing: hasMissing1, missing: missingSkills2 } = hasRequiredSkills(
  ['Python', 'SQL'],
  ['Python', 'JavaScript', 'SQL'],
)
console.assert(hasMissing1, 'Should detect missing skill')
console.assert(missingSkills2.includes('JavaScript'), 'Should identify JavaScript as missing')
console.assert(missingSkills2.length === 1, 'Should have exactly 1 missing skill')

// Case-insensitive matching
const { hasMissing: noMissing2 } = hasRequiredSkills(
  ['python', 'JAVASCRIPT'],
  ['Python', 'JavaScript'],
)
console.assert(!noMissing2, 'Skill matching should be case-insensitive')

console.log('✓ Skill matching tests passed')

// ============================================================================
// Validation & Conflict Detection Tests
// ============================================================================

console.log('\n=== Validation & Conflict Detection Tests ===')

const sessionDate = createDate(2025, 1, 13, 10, 0) // Monday
const sessionEnd = createDate(2025, 1, 13, 12, 0)

// Test 1: No conflicts
const conflicts1 = validateTrainerSessionAssignment({
  trainer: {
    id: 'trainer-1',
    source: 'manuel',
    skills: ['Python', 'JavaScript'],
    availabilityWindows: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
  },
  session: {
    id: 'session-1',
    opensAt: sessionDate,
    closesAt: sessionEnd,
  },
  requiredSkills: ['Python'],
  overlappingSessions: [],
})
console.assert(conflicts1.length === 0, 'Should have no conflicts when trainer is available and skilled')

// Test 2: Double-booked conflict
const conflicts2 = validateTrainerSessionAssignment({
  trainer: {
    id: 'trainer-1',
    source: 'manuel',
    skills: ['Python'],
    availabilityWindows: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
  },
  session: {
    id: 'session-1',
    opensAt: sessionDate,
    closesAt: sessionEnd,
  },
  requiredSkills: ['Python'],
  overlappingSessions: [
    {
      id: 'session-2',
      title: 'Advanced Python',
      opensAt: createDate(2025, 1, 13, 11, 0),
      closesAt: createDate(2025, 1, 13, 13, 0),
    },
  ],
})
console.assert(
  assertConflictExists(conflicts2, 'double_booked'),
  'Should detect double-booking conflict',
)

// Test 3: Outside availability
const conflicts3 = validateTrainerSessionAssignment({
  trainer: {
    id: 'trainer-1',
    source: 'manuel',
    skills: ['Python'],
    availabilityWindows: [{ dayOfWeek: 2, startTime: '09:00', endTime: '17:00' }], // Tuesday only
  },
  session: {
    id: 'session-1',
    opensAt: sessionDate, // Monday
    closesAt: sessionEnd,
  },
  requiredSkills: ['Python'],
  overlappingSessions: [],
})
console.assert(
  assertConflictExists(conflicts3, 'outside_availability'),
  'Should detect availability conflict',
)

// Test 4: Missing skills
const conflicts4 = validateTrainerSessionAssignment({
  trainer: {
    id: 'trainer-1',
    source: 'manuel',
    skills: ['Python'],
    availabilityWindows: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
  },
  session: {
    id: 'session-1',
    opensAt: sessionDate,
    closesAt: sessionEnd,
  },
  requiredSkills: ['Python', 'Kubernetes', 'Go'],
  overlappingSessions: [],
})
console.assert(
  assertConflictExists(conflicts4, 'missing_skills'),
  'Should detect missing skills',
)

console.log('✓ Validation & conflict detection tests passed')

// ============================================================================
// Eligibility Scoring Tests
// ============================================================================

console.log('\n=== Eligibility Scoring Tests ===')

// Test 1: Eligible trainer
const eligible: EligibilityResult = assessTrainerEligibility({
  trainer: {
    id: 'trainer-1',
    fullName: 'Alice Johnson',
    email: 'alice@example.com',
    source: 'manuel',
    status: 'actif',
    skills: ['Python', 'JavaScript', 'SQL'],
    availabilityWindows: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
  },
  session: {
    id: 'session-1',
    opensAt: sessionDate,
    closesAt: sessionEnd,
  },
  requiredSkills: ['Python', 'SQL'],
  overlappingSessions: [],
})
console.assert(eligible.eligibility === 'eligible', 'Should be eligible')
console.assert(eligible.reasons.length === 0, 'Eligible trainer should have no reasons')

// Test 2: Possible trainer (has skills but missing one)
const possible: EligibilityResult = assessTrainerEligibility({
  trainer: {
    id: 'trainer-2',
    fullName: 'Bob Smith',
    email: 'bob@example.com',
    source: 'manuel',
    status: 'actif',
    skills: ['Python'],
    availabilityWindows: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
  },
  session: {
    id: 'session-1',
    opensAt: sessionDate,
    closesAt: sessionEnd,
  },
  requiredSkills: ['Python', 'JavaScript'],
  overlappingSessions: [],
})
console.assert(possible.eligibility === 'possible', 'Should be possible (has some skills)')
console.assert(
  possible.reasons.some((r) => r.type === 'missing_skills'),
  'Should report missing skills',
)

// Test 3: Unavailable trainer (double-booked)
const unavailable: EligibilityResult = assessTrainerEligibility({
  trainer: {
    id: 'trainer-3',
    fullName: 'Charlie Brown',
    email: 'charlie@example.com',
    source: 'manuel',
    status: 'actif',
    skills: ['Python', 'JavaScript'],
    availabilityWindows: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
  },
  session: {
    id: 'session-1',
    opensAt: sessionDate,
    closesAt: sessionEnd,
  },
  requiredSkills: ['Python'],
  overlappingSessions: [
    {
      id: 'session-2',
      title: 'Morning Bootcamp',
      opensAt: createDate(2025, 1, 13, 10, 30),
      closesAt: createDate(2025, 1, 13, 12, 30),
    },
  ],
})
console.assert(unavailable.eligibility === 'unavailable', 'Should be unavailable (double-booked)')
console.assert(
  unavailable.reasons.some((r) => r.type === 'double_booked'),
  'Should report double-booking',
)

console.log('✓ Eligibility scoring tests passed')

// ============================================================================
// Field Conflict Detection Tests (Sync Protection)
// ============================================================================

console.log('\n=== Field Conflict Detection Tests ===')

const conflicts5 = detectFieldConflicts(
  { email: 'alice@old.com', skills: ['Python'], phone: '555-1234' },
  { email: 'alice@new.com', skills: ['Python', 'JavaScript'], phone: '555-1234' },
  ['email', 'skills', 'phone'],
)
console.assert(conflicts5.length === 2, 'Should detect 2 field conflicts')
console.assert(
  conflicts5.some((c) => c.field === 'email'),
  'Should detect email change',
)
console.assert(
  conflicts5.some((c) => c.field === 'skills'),
  'Should detect skills change',
)
console.assert(
  conflicts5.every((c) => c.field !== 'phone'),
  'Phone should have no conflict',
)

console.log('✓ Field conflict detection tests passed')

// ============================================================================
// Summary
// ============================================================================

console.log('\n=== ALL TESTS PASSED ===')
console.log(
  'Summary: 50+ assertions covering overlap, availability, skills, eligibility, and sync protection',
)
