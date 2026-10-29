import 'dotenv/config'
import { prisma } from '../src/prismaClient'

async function runMigration() {
  console.log('[Migration] Starting database migration for PYQ & Section Capping...')

  const statements = [
    `ALTER TYPE "TestMode" ADD VALUE IF NOT EXISTS 'PYQ';`,
    `ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS "isPYQ" BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS "pyqYear" INTEGER;`,
    `ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS "pyqShift" TEXT;`,
    `ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS "pyqPaperName" TEXT;`,
    `ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS "markingScheme" JSONB;`,
    `ALTER TABLE "test_sections" ADD COLUMN IF NOT EXISTS "maxQuestionsToAttempt" INTEGER;`,
    `ALTER TABLE "test_sections" ADD COLUMN IF NOT EXISTS "sectionType" TEXT;`,
    `CREATE INDEX IF NOT EXISTS "idx_test_pyq_lookup" ON "tests" ("examId", "isPYQ", "pyqYear");`,
  ]

  for (const sql of statements) {
    try {
      console.log(`Executing: ${sql}`)
      await prisma.$executeRawUnsafe(sql)
      console.log(`✓ Success`)
    } catch (err: any) {
      console.error(`Error executing "${sql}":`, err.message)
    }
  }

  console.log('[Migration] Verifying columns in "tests" table...')
  const testCols: any = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'tests' AND column_name IN ('isPYQ', 'pyqYear', 'pyqShift', 'pyqPaperName', 'markingScheme');
  `)
  console.log('Columns in "tests":', testCols)

  console.log('[Migration] Verifying columns in "test_sections" table...')
  const secCols: any = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'test_sections' AND column_name IN ('maxQuestionsToAttempt', 'sectionType');
  `)
  console.log('Columns in "test_sections":', secCols)

  await prisma.$disconnect()
  console.log('[Migration] Finished successfully!')
}

runMigration().catch(err => {
  console.error('[Migration Failed]:', err)
  process.exit(1)
})
