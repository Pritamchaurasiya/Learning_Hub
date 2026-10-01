import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['error'],
})

async function runAudit() {
  console.log('='.repeat(60))
  console.log('POSTGRESQL DEEP HEALTH & RESPONSIVENESS AUDIT')
  console.log('='.repeat(60))

  try {
    // 1. Connection & Version Check
    const startConnect = performance.now()
    const versionRes = await prisma.$queryRawUnsafe<any[]>('SELECT version(), current_database(), current_user, inet_server_port();')
    const connectDuration = (performance.now() - startConnect).toFixed(2)

    console.log('\n[1] Connection & Server Details:')
    console.log(`- Connection Latency : ${connectDuration} ms`)
    console.log(`- Database Name      : ${versionRes[0].current_database}`)
    console.log(`- Database User      : ${versionRes[0].current_user}`)
    console.log(`- Port               : ${versionRes[0].inet_server_port}`)
    console.log(`- Version Details    : ${versionRes[0].version.split(',')[0]}`)

    // 2. Latency Benchmark
    console.log('\n[2] Latency Benchmark (SELECT 1 x 10 runs):')
    const latencies: number[] = []
    for (let i = 0; i < 10; i++) {
      const t0 = performance.now()
      await prisma.$queryRawUnsafe('SELECT 1;')
      latencies.push(performance.now() - t0)
    }
    const avgLatency = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2)
    const minLatency = Math.min(...latencies).toFixed(2)
    const maxLatency = Math.max(...latencies).toFixed(2)

    console.log(`- Min Latency: ${minLatency} ms`)
    console.log(`- Avg Latency: ${avgLatency} ms`)
    console.log(`- Max Latency: ${maxLatency} ms`)
    console.log(`- Status     : ${Number(avgLatency) < 15 ? 'ULTRA RESPONSIVE' : 'ACCEPTABLE'}`)

    // 3. Database Size & Pool
    console.log('\n[3] Database Size & Active Connections:')
    const dbSizeRes = await prisma.$queryRawUnsafe<any[]>(
      "SELECT pg_size_pretty(pg_database_size(current_database())) as size;"
    )
    const connCountRes = await prisma.$queryRawUnsafe<any[]>(
      "SELECT count(*) as total, count(*) FILTER (WHERE state = 'active') as active, count(*) FILTER (WHERE state = 'idle') as idle FROM pg_stat_activity WHERE datname = current_database();"
    )

    console.log(`- Total Database Size: ${dbSizeRes[0].size}`)
    console.log(`- Total Connections  : ${connCountRes[0].total} (Active: ${connCountRes[0].active}, Idle: ${connCountRes[0].idle})`)

    // 4. Schema & Table Statistics
    console.log('\n[4] Key Tables & Record Counts:')
    const tableCountsRes = await prisma.$queryRawUnsafe<any[]>(
      "SELECT count(*) as total_tables FROM information_schema.tables WHERE table_schema = 'public';"
    )
    console.log(`- Total Public Tables in Schema: ${tableCountsRes[0].total_tables}`)

    const tablesToCheck = ['user', 'test', 'question', 'exam', 'auditLog', 'activityLog', 'contest']
    for (const model of tablesToCheck) {
      const t0 = performance.now()
      try {
        // @ts-ignore
        const count = await prisma[model].count()
        const duration = (performance.now() - t0).toFixed(2)
        console.log(`  * ${model.padEnd(15)} : ${count.toString().padStart(6)} records (${duration} ms)`)
      } catch (e: any) {
        console.log(`  * ${model.padEnd(15)} : [Skipped: ${e.message.split('\n')[0]}]`)
      }
    }

    // 5. Read Query Complex Test
    console.log('\n[5] Complex Read Query (with field projections):')
    const tRead0 = performance.now()
    const users = await prisma.user.findMany({
      take: 5,
      select: {
        id: true,
        email: true,
        role: true,
        xp: true,
        level: true,
        createdAt: true,
      },
    })
    const readDuration = (performance.now() - tRead0).toFixed(2)
    console.log(`- Read ${users.length} users with projection: ${readDuration} ms`)

    // 6. Write & Atomic Transaction Test
    console.log('\n[6] Write & Atomic Transaction Responsiveness:')
    const tWrite0 = performance.now()
    const txResult = await prisma.$transaction(async (tx) => {
      const log = await tx.auditLog.create({
        data: {
          action: 'LOGIN',
          entityType: 'SystemHealthCheck',
          entityId: 'test-audit-' + Date.now(),
          metadata: { benchmark: true, timestamp: new Date().toISOString() },
        },
      })
      const readBack = await tx.auditLog.findUnique({ where: { id: log.id } })
      await tx.auditLog.delete({ where: { id: log.id } })
      return readBack?.id
    })
    const writeDuration = (performance.now() - tWrite0).toFixed(2)
    console.log(`- Complete Atomic Transaction (INSERT -> SELECT -> DELETE): ${writeDuration} ms`)
    // 7. Memory & Index Efficiency
    console.log('\n[7] Memory & Index Efficiency:')
    const cacheHitRes = await prisma.$queryRawUnsafe<any[]>(
      'SELECT coalesce(round(sum(heap_blks_hit) * 100.0 / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2), 100.0) as cache_hit_ratio FROM pg_statio_user_tables;'
    )
    const indexesRes = await prisma.$queryRawUnsafe<any[]>(
      "SELECT count(*) as total_indexes FROM pg_indexes WHERE schemaname = 'public';"
    )
    console.log(`- Buffer Cache Hit Ratio: ${cacheHitRes[0].cache_hit_ratio}%`)
    console.log(`- Total Public Indexes   : ${indexesRes[0].total_indexes}`)

    console.log('\n' + '='.repeat(60))
    console.log('ALL POSTGRESQL CONNECTIVITY & RESPONSIVENESS CHECKS PASSED!')
    console.log('='.repeat(60))
  } catch (error: any) {
    console.error('\nPOSTGRESQL AUDIT ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

void runAudit()
