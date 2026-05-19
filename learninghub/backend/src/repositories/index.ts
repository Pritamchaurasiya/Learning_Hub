import type { PrismaClient } from '@prisma/client'
import { UserRepository } from './UserRepository'
import { CourseRepository } from './CourseRepository'
import { BaseRepository, QueryParams, PaginatedResult } from './BaseRepository'

// Export all repositories
export * from './BaseRepository'
export * from './UserRepository'
export * from './CourseRepository'

// Repository factory for dependency injection
export class RepositoryFactory {
  private static instances: Map<string, unknown> = new Map()

  static getUserRepository(prisma: PrismaClient): UserRepository {
    if (!this.instances.has('userRepository')) {
      this.instances.set('userRepository', new UserRepository(prisma))
    }
    return this.instances.get('userRepository') as UserRepository
  }

  static getCourseRepository(prisma: PrismaClient): CourseRepository {
    if (!this.instances.has('courseRepository')) {
      this.instances.set('courseRepository', new CourseRepository(prisma))
    }
    return this.instances.get('courseRepository') as CourseRepository
  }

  static clear(): void {
    this.instances.clear()
  }
}

// Types
export type { QueryParams, PaginatedResult }

// Default exports for convenience
export { UserRepository, CourseRepository, BaseRepository }
