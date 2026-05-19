import type { PrismaClient } from '@prisma/client'

export interface QueryParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: Record<string, unknown>
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Type for transaction client - has same methods as PrismaClient but in transaction context
export type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

export abstract class BaseRepository<T, CreateInput, UpdateInput> {
  protected prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  abstract findById(id: string): Promise<T | null>
  abstract create(data: CreateInput, tx?: TxClient): Promise<T>
  abstract update(id: string, data: UpdateInput, tx?: TxClient): Promise<T>
  abstract delete(id: string, tx?: TxClient): Promise<void>
  abstract softDelete(id: string, tx?: TxClient): Promise<void>
  abstract restore(id: string, tx?: TxClient): Promise<void>

  protected getPrismaInstance(tx?: TxClient): TxClient {
    return tx ?? (this.prisma as unknown as TxClient)
  }

  protected buildPaginationParams(params: QueryParams) {
    const page = Math.max(1, params.page ?? 1)
    const limit = Math.min(100, Math.max(1, params.limit ?? 20))
    const skip = (page - 1) * limit

    return { page, limit, skip }
  }

  protected buildOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
    if (!sortBy) return { createdAt: sortOrder }
    return { [sortBy]: sortOrder }
  }

  protected buildPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): PaginatedResult<T> {
    const totalPages = Math.ceil(total / limit)
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }
  }
}
