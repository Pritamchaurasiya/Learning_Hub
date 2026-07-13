const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
prisma.user
  .updateMany({ data: { failedLogins: 0, lockedUntil: null } })
  .then(() => console.log('Unlocked'))
  .catch(console.error)
  .finally(() => prisma.$disconnect())
