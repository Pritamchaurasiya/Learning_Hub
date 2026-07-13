import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@learninghub.app'
  const plainPassword = 'ChangeMeImmediately123!'

  let user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    console.log('Admin user not found. Creating one...')
    const hashedPassword = await bcrypt.hash(plainPassword, 12)

    user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username: 'admin',
        role: 'ADMIN',
      },
    })
    console.log('Admin user created successfully:', user.id)
  } else {
    console.log('Admin user already exists. ID:', user.id)
    if (user.role !== 'ADMIN') {
      await prisma.user.update({
        where: { email },
        data: { role: 'ADMIN' },
      })
      console.log('Updated user role to ADMIN.')
    }
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
