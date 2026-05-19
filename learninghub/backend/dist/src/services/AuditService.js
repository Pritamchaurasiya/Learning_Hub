"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const client_1 = require("@prisma/client");
class AuditService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async log(input, tx) {
        const prisma = tx ?? this.prisma;
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
                    severity: input.severity ?? client_1.Severity.INFO,
                    metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
                    ipAddress: input.ipAddress,
                    userAgent: input.userAgent,
                    sessionId: input.sessionId,
                    requestId: input.requestId,
                },
            });
        }
        catch (error) {
            // Log to console as fallback - never fail the main operation
            console.error('Failed to create audit log:', error);
            console.error('Audit entry:', input);
        }
    }
    async logFromRequest(req, action, options = {}) {
        const userId = req.user?.userId;
        const requestId = req.headers['x-request-id'] || undefined;
        await this.log({
            action,
            userId,
            requestId,
            ipAddress: req.ip ?? undefined,
            userAgent: req.headers['user-agent'] ?? undefined,
            sessionId: req.headers['x-session-id'] || undefined,
            ...options,
        });
    }
    async queryLogs(params) {
        const page = Math.max(1, params.page ?? 1);
        const limit = Math.min(100, Math.max(1, params.limit ?? 20));
        const skip = (page - 1) * limit;
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
        };
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
        ]);
        return {
            logs,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async getEntityHistory(entityType, entityId, limit = 50) {
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
        });
    }
    async getUserActivity(userId, params = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) {
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
        });
    }
    async getSecurityEvents(params = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) {
        return this.prisma.auditLog.findMany({
            where: {
                severity: params.severity ?? { in: [client_1.Severity.WARNING, client_1.Severity.ERROR, client_1.Severity.CRITICAL] },
                action: {
                    in: [
                        client_1.AuditAction.LOGIN,
                        client_1.AuditAction.PASSWORD_CHANGE,
                        client_1.AuditAction.ROLE_CHANGE,
                        client_1.AuditAction.PERMISSION_CHANGE,
                        client_1.AuditAction.DELETE,
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
        });
    }
}
exports.AuditService = AuditService;
