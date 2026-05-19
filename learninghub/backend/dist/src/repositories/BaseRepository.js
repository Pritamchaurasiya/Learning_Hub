"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
class BaseRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    getPrismaInstance(tx) {
        return tx ?? this.prisma;
    }
    buildPaginationParams(params) {
        const page = Math.max(1, params.page ?? 1);
        const limit = Math.min(100, Math.max(1, params.limit ?? 20));
        const skip = (page - 1) * limit;
        return { page, limit, skip };
    }
    buildOrderBy(sortBy, sortOrder = 'desc') {
        if (!sortBy)
            return { createdAt: sortOrder };
        return { [sortBy]: sortOrder };
    }
    buildPaginatedResponse(data, total, page, limit) {
        const totalPages = Math.ceil(total / limit);
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
        };
    }
}
exports.BaseRepository = BaseRepository;
