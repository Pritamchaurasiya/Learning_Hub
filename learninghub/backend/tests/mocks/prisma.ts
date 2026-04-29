import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

export type Context = {
  prisma: DeepMockProxy<PrismaClient>;
};

export const createMockContext = (): Context => {
  return {
    prisma: mockDeep<PrismaClient>(),
  };
};

// Singleton for test context
let mockContext: Context;

export const getMockContext = (): Context => {
  if (!mockContext) {
    mockContext = createMockContext();
  }
  return mockContext;
};

// Reset mock context between tests
export const resetMockContext = (): void => {
  mockContext = createMockContext();
};
