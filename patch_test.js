const fs = require('fs');
const filePath = 'learninghub/backend/tests/config/database.test.ts';
let content = fs.readFileSync(filePath, 'utf8');

// The original file sets up a TestableExtendedPrismaClient.
// We just need to mock the $transaction method on it, or the base ExtendedPrismaClient.
content = content.replace(
  "class TestableExtendedPrismaClient extends ExtendedPrismaClient {",
  "class TestableExtendedPrismaClient extends ExtendedPrismaClient {\n  $transaction = jest.fn().mockImplementation(async (fn) => {\n    const mockTx = { ...this, $queryRaw: jest.fn() } as unknown as any;\n    return await fn(mockTx);\n  });"
);

fs.writeFileSync(filePath, content);
