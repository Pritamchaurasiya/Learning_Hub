require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function countIfDelegateExists(delegateName) {
  const delegate = prisma[delegateName]
  if (!delegate || typeof delegate.count !== 'function') return undefined
  return delegate.count()
}

async function main() {
  const counts = {}
  for (const delegateName of [
    'user',
    'test',
    'question',
    'option',
    'testAttempt',
    'testResult',
    'topicPerformance',
    'activityLog',
  ]) {
    const value = await countIfDelegateExists(delegateName)
    if (value !== undefined) counts[delegateName] = value
  }

  const [checks] = await prisma.$queryRawUnsafe(`
    select
      (select count(*)::int
       from questions q
       left join tests t on t.id = q."testId"
       where t.id is null) as orphan_questions,
      (select count(*)::int
       from options o
       left join questions q on q.id = o."questionId"
       where q.id is null) as orphan_options,
      (select count(*)::int
       from test_results tr
       left join tests t on t.id = tr."testId"
       where t.id is null) as orphan_test_results,
      (select count(*)::int
       from test_results tr
       left join users u on u.id = tr."userId"
       where u.id is null) as orphan_result_users,
      (select count(*)::int
       from tests t
       where not exists (select 1 from questions q where q."testId" = t.id)) as tests_without_questions,
      (select count(*)::int
       from questions q
       where not exists (select 1 from options o where o."questionId" = q.id)) as questions_without_options,
      (select count(*)::int
       from questions q
       where not exists (
         select 1 from options o where o."questionId" = q.id and o."isCorrect" = true
       )) as questions_without_correct_option
  `)

  const [migrationTable] = await prisma.$queryRawUnsafe(`
    select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public' and table_name = '_prisma_migrations'
    ) as exists
  `)

  let migrations = []
  if (migrationTable.exists) {
    migrations = await prisma.$queryRawUnsafe(`
      select migration_name, finished_at, rolled_back_at
      from _prisma_migrations
      order by started_at
    `)
  }

  console.log(
    JSON.stringify(
      {
        counts,
        checks,
        migrationTableExists: Boolean(migrationTable.exists),
        migrations,
      },
      null,
      2
    )
  )
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
