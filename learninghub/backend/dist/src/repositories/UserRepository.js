"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
class UserRepository extends BaseRepository_1.BaseRepository {
    async findById(id, includeRelations = false) {
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
        });
    }
    async findByEmail(email) {
        return this.prisma.user.findUnique({
            where: {
                email: email.toLowerCase().trim(),
                deletedAt: null,
            },
        });
    }
    async findByUsername(username) {
        return this.prisma.user.findFirst({
            where: {
                username: { equals: username, mode: 'insensitive' },
                deletedAt: null,
            },
        });
    }
    async findManyList(params = {}) {
        const { page, limit, skip } = this.buildPaginationParams(params);
        const where = {
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
        };
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
        ]);
        return this.buildPaginatedResponse(data, total, page, limit);
    }
    async create(data, tx) {
        const prisma = this.getPrismaInstance(tx);
        return prisma.user.create({
            data: {
                ...data,
                email: data.email.toLowerCase().trim(),
            },
        });
    }
    async update(id, data, tx) {
        const prisma = this.getPrismaInstance(tx);
        return prisma.user.update({
            where: { id },
            data: {
                ...data,
                ...(data.email && { email: data.email.toLowerCase().trim() }),
                updatedAt: new Date(),
            },
        });
    }
    async delete(id, tx) {
        const prisma = this.getPrismaInstance(tx);
        await prisma.user.delete({ where: { id } });
    }
    async softDelete(id, tx) {
        const prisma = this.getPrismaInstance(tx);
        await prisma.user.update({
            where: { id },
            data: { deletedAt: new Date(), updatedAt: new Date() },
        });
    }
    async restore(id, tx) {
        const prisma = this.getPrismaInstance(tx);
        await prisma.user.update({
            where: { id },
            data: { deletedAt: null, updatedAt: new Date() },
        });
    }
    async incrementLoginCount(id, tx) {
        const prisma = this.getPrismaInstance(tx);
        await prisma.user.update({
            where: { id },
            data: {
                loginCount: { increment: 1 },
                lastLoginAt: new Date(),
                lastActive: new Date(),
                failedLogins: 0,
                lockedUntil: null,
            },
        });
    }
    async incrementFailedLogins(id, tx) {
        const prisma = this.getPrismaInstance(tx);
        const maxFailedAttempts = 5;
        const lockoutDuration = 30 * 60 * 1000; // 30 minutes
        const currentUser = await prisma.user.findUnique({
            where: { id },
            select: { failedLogins: true },
        });
        if (!currentUser)
            throw new Error('User not found');
        const newFailedLogins = currentUser.failedLogins + 1;
        const shouldLock = newFailedLogins >= maxFailedAttempts;
        const user = await prisma.user.update({
            where: { id },
            data: {
                failedLogins: newFailedLogins,
                lockedUntil: shouldLock ? new Date(Date.now() + lockoutDuration) : null,
            },
        });
        return user;
    }
    async updateStreak(id, newStreak, tx) {
        const prisma = this.getPrismaInstance(tx);
        // Get current longest streak
        const user = await prisma.user.findUnique({
            where: { id },
            select: { longestStreak: true },
        });
        if (!user)
            throw new Error('User not found');
        await prisma.user.update({
            where: { id },
            data: {
                streak: newStreak,
                longestStreak: Math.max(newStreak, user.longestStreak),
                lastActive: new Date(),
            },
        });
    }
    async addXp(id, xp, tx) {
        const prisma = this.getPrismaInstance(tx);
        // Calculate new level: level = floor(xp / 100) + 1
        // e.g., 0-99 XP = Level 1, 100-199 XP = Level 2, etc.
        const currentUser = await prisma.user.findUnique({
            where: { id },
            select: { xp: true, level: true },
        });
        if (!currentUser)
            throw new Error('User not found');
        const newXp = currentUser.xp + xp;
        const newLevel = Math.floor(newXp / 100) + 1;
        await prisma.user.update({
            where: { id },
            data: { xp: newXp, level: newLevel },
        });
        return { newXp, newLevel };
    }
    async isEmailTaken(email, excludeUserId) {
        const where = {
            email: email.toLowerCase().trim(),
            deletedAt: null,
            ...(excludeUserId && { id: { not: excludeUserId } }),
        };
        const count = await this.prisma.user.count({ where });
        return count > 0;
    }
    async isUsernameTaken(username, excludeUserId) {
        const where = {
            username: { equals: username, mode: 'insensitive' },
            deletedAt: null,
            ...(excludeUserId && { id: { not: excludeUserId } }),
        };
        const count = await this.prisma.user.count({ where });
        return count > 0;
    }
}
exports.UserRepository = UserRepository;
