import { PrismaClient, User, Prisma, UserRole } from '@prisma/client'
import { BaseRepository, QueryParams, PaginatedResult } from './BaseRepository'

export interface CreateUserInput {
  email: string
  password: string
  username?: string
  role?: UserRole
  avatar?: string
  bio?: string
  location?: string
  website?: string
}

export interface UpdateUserInput {
  email?: string
  password?: string
  username?: string
  role?: UserRole
  avatar?: string
  bio?: string
  location?: string
  website?: string
  dateOfBirth?: Date
  timezone?: string
  preferredLanguage?: string
  xp?: number
  level?: number
  streak?: number
  longestStreak?: number
  lastActive?: Date
  lastLoginAt?: Date
  loginCount?: number
  failedLogins?: number
  lockedUntil?: Date | null
  emailVerified?: boolean
  emailVerifiedAt?: Date
  mfaEnabled?: boolean
  mfaSecret?: string | null
}

export interface UserFilters {
  role?: UserRole
  emailVerified?: boolean
  search?: string
  createdAfter?: Date
  createdBefore?: Date
  isActive?: boolean
}

// Summary type for user listings (partial fields)
export interface UserSummary {
  id: string
  email: string
  username: string | null
  role: UserRole
  avatar: string | null
  xp: number
  level: number
  streak: number
  lastActive: Date
  createdAt: Date
  emailVerified: boolean
  lockedUntil: Date | null
}

export class UserRepository extends BaseRepository<User, CreateUserInput, UpdateUserInput> {
  async findById(id: string, includeRelations = false): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: includeRelations
        ? {
            progress: true,
            achievements: true,
            bookmarks: true,
            sessions: { where: { isRevoked: false } },
          }
        : undefined,
    })
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        email: email.toLowerCase().trim(),
        deletedAt: null,
      },
    })
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        username: { equals: username, mode: 'insensitive' },
        deletedAt: null,
      },
    })
  }

  async findManyList(
    params: QueryParams & UserFilters = {}
  ): Promise<PaginatedResult<UserSummary>> {
    const { page, limit, skip } = this.buildPaginationParams(params)

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(params.role && { role: params.role }),
      ...(params.emailVerified !== undefined && {
        emailVerified: params.emailVerified,
      }),
      ...(params.search && {
        OR: [
          { email: { contains: params.search, mode: 'insensitive' } },
          { username: { contains: params.search, mode: 'insensitive' } },
        ],
      }),
      ...(params.createdAfter && { createdAt: { gte: params.createdAfter } }),
      ...(params.createdBefore && { createdAt: { lte: params.createdBefore } }),
      ...(params.isActive !== undefined && {
        lockedUntil: params.isActive ? null : { not: null },
      }),
    }

    const [total, data] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: this.buildOrderBy(params.sortBy, params.sortOrder),
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          avatar: true,
          xp: true,
          level: true,
          streak: true,
          lastActive: true,
          createdAt: true,
          emailVerified: true,
          lockedUntil: true,
        },
      }),
    ])

    return this.buildPaginatedResponse(data, total, page, limit)
  }

  async create(data: CreateUserInput, tx?: PrismaClient): Promise<User> {
    const prisma = this.getPrismaInstance(tx)
    return prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase().trim(),
      },
    })
  }

  async update(id: string, data: UpdateUserInput, tx?: PrismaClient): Promise<User> {
    const prisma = this.getPrismaInstance(tx)
    return prisma.user.update({
      where: { id },
      data: {
        ...data,
        ...(data.email && { email: data.email.toLowerCase().trim() }),
        updatedAt: new Date(),
      },
    })
  }

  async delete(id: string, tx?: PrismaClient): Promise<void> {
    const prisma = this.getPrismaInstance(tx)
    await prisma.user.delete({ where: { id } })
  }

  async softDelete(id: string, tx?: PrismaClient): Promise<void> {
    const prisma = this.getPrismaInstance(tx)
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    })
  }

  async restore(id: string, tx?: PrismaClient): Promise<void> {
    const prisma = this.getPrismaInstance(tx)
    await prisma.user.update({
      where: { id },
      data: { deletedAt: null, updatedAt: new Date() },
    })
  }

  async incrementLoginCount(id: string, tx?: PrismaClient): Promise<void> {
    const prisma = this.getPrismaInstance(tx)
    await prisma.user.update({
      where: { id },
      data: {
        loginCount: { increment: 1 },
        lastLoginAt: new Date(),
        lastActive: new Date(),
        failedLogins: 0,
        lockedUntil: null,
      },
    })
  }

  async incrementFailedLogins(id: string, tx?: PrismaClient): Promise<User> {
    const prisma = this.getPrismaInstance(tx)
    const maxFailedAttempts = 5
    const lockoutDuration = 30 * 60 * 1000 // 30 minutes

    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: { failedLogins: true },
    })

    if (!currentUser) throw new Error('User not found')

    const newFailedLogins = currentUser.failedLogins + 1
    const shouldLock = newFailedLogins >= maxFailedAttempts

    const user = await prisma.user.update({
      where: { id },
      data: {
        failedLogins: newFailedLogins,
        lockedUntil: shouldLock ? new Date(Date.now() + lockoutDuration) : null,
      },
    })

    return user
  }

  async updateStreak(id: string, newStreak: number, tx?: PrismaClient): Promise<void> {
    const prisma = this.getPrismaInstance(tx)

    // Get current longest streak
    const user = await prisma.user.findUnique({
      where: { id },
      select: { longestStreak: true },
    })

    if (!user) throw new Error('User not found')

    await prisma.user.update({
      where: { id },
      data: {
        streak: newStreak,
        longestStreak: Math.max(newStreak, user.longestStreak),
        lastActive: new Date(),
      },
    })
  }

  async addXp(
    id: string,
    xp: number,
    tx?: PrismaClient
  ): Promise<{ newXp: number; newLevel: number }> {
    const prisma = this.getPrismaInstance(tx)

    // Calculate new level: level = floor(xp / 100) + 1
    // e.g., 0-99 XP = Level 1, 100-199 XP = Level 2, etc.
    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: { xp: true, level: true },
    })

    if (!currentUser) throw new Error('User not found')

    const newXp = currentUser.xp + xp
    const newLevel = Math.floor(newXp / 100) + 1

    await prisma.user.update({
      where: { id },
      data: { xp: newXp, level: newLevel },
    })

    return { newXp, newLevel }
  }

  async isEmailTaken(email: string, excludeUserId?: string): Promise<boolean> {
    const where: Prisma.UserWhereInput = {
      email: email.toLowerCase().trim(),
      deletedAt: null,
      ...(excludeUserId && { id: { not: excludeUserId } }),
    }

    const count = await this.prisma.user.count({ where })
    return count > 0
  }

  async isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
    const where: Prisma.UserWhereInput = {
      username: { equals: username, mode: 'insensitive' },
      deletedAt: null,
      ...(excludeUserId && { id: { not: excludeUserId } }),
    }

    const count = await this.prisma.user.count({ where })
    return count > 0
  }
}
