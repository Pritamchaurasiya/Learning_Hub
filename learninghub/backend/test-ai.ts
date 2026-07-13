import { aiTestService } from './src/services/AITestService'
import { prisma } from './src/prismaClient'

async function test() {
  try {
    // 1. Create a dummy user
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@test.com`,
        password: 'password123',
        username: 'testuser',
      },
    })

    console.log('Created user:', user.id)

    // 2. Try to generate a test
    console.log('Attempting to generate AI test...')
    const result = await aiTestService.generateTest({
      userId: user.id,
      topic: 'JavaScript Variables',
      difficulty: 'EASY',
      count: 5,
      mode: 'PRACTICE',
    })

    console.log('Test generation result:')
    console.log(JSON.stringify(result, null, 2))

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } })
  } catch (error) {
    console.error('FAILED TO GENERATE TEST:', error)
  } finally {
    await prisma.$disconnect()
  }
}

test()
