import { PrismaClient, Prisma, AuditAction, Severity } from '@prisma/client'
import { Request } from 'express'

export interface AuditLogInput {
  action: AuditAction
  userId?: string
  entityType?: string
  entityId?: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  description?: string
  severity?: Severity
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  sessionId?: string
  requestId?: string
}

export class AuditService {
  constructor(private prisma: PrismaClient) {}

  async log(input: AuditLogInput, tx?: PrismaClient): Promise<void> {
    const prisma = tx ?? this.prisma

    try {
      await prisma.auditLog.create({
        data: {
          action: input.action,
          userId: input.userId,
          entityType: input.entityType,
          entityId: input.entityId,
          oldValues: input.oldValues ? JSON.parse(JSON.stringify(input.oldValues)) : undefined,
          newValues: input.newValues ? JSON.parse(JSON.stringify(input.newValues)) : undefined,
          description: input.description,
          severity: input.severity ?? Severity.INFO,
          metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          sessionId: input.sessionId,
          requestId: input.requestId,
        },
      })
    } catch (error) {
      // Log to console as fallback - never fail the main operation
      console.error('Failed to create audit log:', error)
      console.error('Audit entry:', input)
    }
  }

  async logFromRequest(
    req: Request,
    action: AuditAction,
    options: {
      entityType?: string
      entityId?: string
      oldValues?: Record<string, unknown>
      newValues?: Record<string, unknown>
      description?: string
      severity?: Severity
    } = {}
  ): Promise<void> {
    const userId = req.user?.userId
    const requestId = (req.headers['x-request-id'] as string) || undefined

    await this.log({
      action,
      userId,
      requestId,
      ipAddress: req.ip ?? undefined,
      userAgent: req.headers['user-agent'] ?? undefined,
      sessionId: (req.headers['x-session-id'] as string) || undefined,
      ...options,
    })
  }

  async queryLogs(params: {
    userId?: string
    action?: AuditAction
    entityType?: string
    entityId?: string
    severity?: Severity
    startDate?: Date
    endDate?: Date
    page?: number
    limit?: number
  }): Promise<{
    logs: Prisma.AuditLogGetPayload<{}>[]
    total: number
    page: number
    totalPages: number
  }> {
    const page = Math.max(1, params.page ?? 1)
    const limit = Math.min(100, Math.max(1, params.limit ?? 20))
    const skip = (page - 1) * limit

    const where = {
      ...(params.userId && { userId: params.userId }),
      ...(params.action && { action: params.action }),
      ...(params.entityType && { entityType: params.entityType }),
      ...(params.entityId && { entityId: params.entityId }),
      ...(params.severity && { severity: params.severity }),
      ...(params.startDate &&
        params.endDate && {
          createdAt: {
            gte: params.startDate,
            lte: params.endDate,
          },
        }),
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
            },
          },
        },
      }),
    ])

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getEntityHistory(entityType: string, entityId: string, limit: number = 50): Promise<any[]> {
    return this.prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    })
  }

  async getUserActivity(
    userId: string,
    params: {
      startDate?: Date
      endDate?: Date
      actions?: AuditAction[]
      limit?: number
    } = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any[]> {
    return this.prisma.auditLog.findMany({
      where: {
        userId,
        ...(params.actions && { action: { in: params.actions } }),
        ...(params.startDate &&
          params.endDate && {
            createdAt: {
              gte: params.startDate,
              lte: params.endDate,
            },
          }),
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 100,
    })
  }

  async getSecurityEvents(
    params: {
      severity?: Severity
      startDate?: Date
      endDate?: Date
      limit?: number
    } = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any[]> {
    return this.prisma.auditLog.findMany({
      where: {
        severity: params.severity ?? { in: [Severity.WARNING, Severity.ERROR, Severity.CRITICAL] },
        action: {
          in: [
            AuditAction.LOGIN,
            AuditAction.PASSWORD_CHANGE,
            AuditAction.ROLE_CHANGE,
            AuditAction.PERMISSION_CHANGE,
            AuditAction.DELETE,
          ],
        },
        ...(params.startDate &&
          params.endDate && {
            createdAt: {
              gte: params.startDate,
              lte: params.endDate,
            },
          }),
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 100,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    })
  }
}
