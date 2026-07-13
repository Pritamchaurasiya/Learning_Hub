const fs = require('fs')

const path = 'prisma/schema.prisma'
let schema = fs.readFileSync(path, 'utf8')

// 1. Fix CanonicalQuestion mapping
schema = schema.replace(
  /model CanonicalQuestion {([\s\S]*?)@@map\("questions"\)\n}/g,
  'model CanonicalQuestion {$1@@map("canonical_questions")\n}'
)

// 2. Add fields to TestResult
schema = schema.replace(
  /model TestResult {([\s\S]*?)questionResults Json\?/g,
  'model TestResult {$1questionResults Json?\n  abilityScore    Float?\n  confidenceScore Float?\n  isFlagged       Boolean       @default(false)\n  flagReason      String?'
)

// 3. Add fields to Question
schema = schema.replace(
  /model Question {([\s\S]*?)difficulty         Float               @default\(0\.5\)/g,
  'model Question {$1difficulty         Float               @default(0.5)\n  discrimination     Float               @default(1.0)\n  guessing           Float               @default(0.0)'
)

// 4. Fix Concept relation
schema = schema.replace(
  /model Concept {([\s\S]*?)prereqs   ConceptPrerequisite\[\]/g,
  'model Concept {$1prerequisites   ConceptPrerequisite[] @relation("ConceptPrerequisites")\n  prerequisiteFor ConceptPrerequisite[] @relation("PrerequisiteConcepts")'
)

// 5. Fix TestBlueprint missing opposites
schema = schema.replace(
  /model TestBlueprint {([\s\S]*?)updatedAt    DateTime @updatedAt/g,
  'model TestBlueprint {$1updatedAt    DateTime @updatedAt\n  blueprintSections TestBlueprintSection[]\n  topicRules        TestBlueprintTopicRule[]'
)

// 6. Fix UserConceptMastery missing relation
schema = schema.replace(
  /model UserConceptMastery {([\s\S]*?)updatedAt       DateTime @updatedAt/g,
  'model UserConceptMastery {$1updatedAt       DateTime @updatedAt\n\n  concept         Concept  @relation(fields: [conceptId], references: [id], onDelete: Cascade)'
)

// 7. Fix QuestionResponse missing opposite
schema = schema.replace(
  /model QuestionResponse {([\s\S]*?)createdAt         DateTime  @default\(now\(\)\)/g,
  'model QuestionResponse {$1createdAt         DateTime  @default(now())\n\n  attempt           TestAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)'
)

// 8. Fix AttemptSnapshot missing opposite
schema = schema.replace(
  /model AttemptSnapshot {([\s\S]*?)updatedAt DateTime @updatedAt/g,
  'model AttemptSnapshot {$1updatedAt DateTime @updatedAt\n\n  attempt   TestAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)'
)

// 9. Fix TestAttemptEvent missing opposite
schema = schema.replace(
  /model TestAttemptEvent {([\s\S]*?)createdAt    DateTime @default\(now\(\)\)/g,
  'model TestAttemptEvent {$1createdAt    DateTime @default(now())\n\n  attempt      TestAttempt? @relation(fields: [attemptId], references: [id], onDelete: Cascade)\n  session      TestSession? @relation(fields: [sessionId], references: [id], onDelete: Cascade)'
)

// 10. Fix AchievementDefinition missing opposite
schema = schema.replace(
  /model AchievementDefinition {([\s\S]*?)updatedAt DateTime @updatedAt/g,
  'model AchievementDefinition {$1updatedAt DateTime @updatedAt\n\n  userAchievements UserAchievement[]'
)

fs.writeFileSync(path, schema)
console.log('Schema fixed with exact model boundaries')
