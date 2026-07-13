import { PrismaClient } from '@prisma/client'
import { aiTestService } from '../backend/src/services/AITestService'

const prisma = new PrismaClient()

async function main() {
  try {
    const user = await prisma.user.findFirst()
    if (!user) throw new Error("No user found")

    console.log("Generating test for user:", user.id)
    const result = await aiTestService.generateTest({
      userId: user.id,
      topic: 'JavaScript Variables',
      difficulty: 'EASY',
      count: 2,
      mode: 'PRACTICE'
    })
    console.log("Success:", result)
  } catch (error) {
    console.error("Error generating test:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
