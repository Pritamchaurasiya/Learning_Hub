import { testScoringService } from './src/services/TestScoringService';
import { testSessionService } from './src/services/TestSessionService';
import { prisma } from './src/prismaClient';

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No user");

  // Pick a mock test
  const test = await prisma.test.findFirst({
    where: { questions: { some: {} } },
    include: { questions: { include: { options: true } } }
  });
  if (!test) throw new Error("No test");

  console.log("Found test:", test.id);

  // Auto-save a draft
  const questionId = test.questions[0].id;
  const optionId = test.questions[0].options[0].id;

  await testSessionService.syncHeartbeat(user.id, test.id, {
    [questionId]: { questionId, selectedOptionId: optionId, timeSpentMs: 5000 }
  });
  console.log("Heartbeat synced");

  // Submit test
  const answers = {
    [questionId]: optionId
  };
  
  const result = await testScoringService.scoreAndSubmitTest({
    userId: user.id,
    testId: test.id,
    answers,
    timeTaken: 10
  });

  console.log("Submission result:", result.result?.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
