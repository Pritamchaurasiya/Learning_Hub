import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to Prisma...");
  await prisma.$connect();
  console.log("Running SELECT 1...");
  const result = await prisma.$queryRaw`SELECT 1`;
  console.log("Result:", result);
  await prisma.$disconnect();
}

main().catch(console.error);
