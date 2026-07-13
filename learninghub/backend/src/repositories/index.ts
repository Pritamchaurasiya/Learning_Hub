import type { PrismaClient } from '@prisma/client'
import { UserRepository } from './UserRepository'
import { TestRepository } from './TestRepository'
import { BaseRepository, QueryParams, PaginatedResult } from './BaseRepository'

// Export all repositories
export * from './BaseRepository'
export * from './UserRepository'
export * from './TestRepository'

// Repository factory for dependency injection
export class RepositoryFactory {
  private static instances: Map<string, unknown> = new Map()

  static getUserRepository(prisma: PrismaClient): UserRepository {
    if (!this.instances.has('userRepository')) {
      this.instances.set('userRepository', new UserRepository(prisma))
    }
    return this.instances.get('userRepository') as UserRepository
  }

  static getTestRepository(prisma: PrismaClient): TestRepository {
    if (!this.instances.has('testRepository')) {
      this.instances.set('testRepository', new TestRepository(prisma))
    }
    return this.instances.get('testRepository') as TestRepository
  }

  static clear(): void {
    this.instances.clear()
  }
}

// Types
export type { QueryParams, PaginatedResult }

// Default exports for convenience
export { UserRepository, BaseRepository }
