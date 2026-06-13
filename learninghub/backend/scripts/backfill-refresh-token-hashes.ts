import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import { isAlreadyHashed } from '../src/utils/auth'

const prisma = new PrismaClient()

async function backfill() {
  const tokens = await prisma.refreshToken.findMany({ select: { id: true, token: true } })
  console.log(`Found ${tokens.length} refresh tokens to backfill`)
  let count = 0
  for (const t of tokens) {
    if (t.token) {
      if (isAlreadyHashed(t.token)) {
        console.log(`Skipping already-hashed token ${t.id}`)
        continue
      }
      const hash = crypto.createHash('sha256').update(t.token).digest('hex')
      await prisma.refreshToken.update({ where: { id: t.id }, data: { token: hash } })
      count++
    }
  }
  console.log(`Backfilled ${count} tokens`)
}

backfill()
  .catch(err => {
    console.error('Backfill failed', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
