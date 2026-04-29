"use strict";
/**
 * Pagination utility for API endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaginatedResponse = exports.getPaginationParams = void 0;
const getPaginationParams = (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};
exports.getPaginationParams = getPaginationParams;
const createPaginatedResponse = (data, total, page, limit) => {
    const pages = Math.ceil(total / limit);
    return {
        status: 'success',
        data,
        meta: {
            total,
            page,
            limit,
            pages,
            hasNext: page < pages,
            hasPrev: page > 1
        }
    };
};
exports.createPaginatedResponse = createPaginatedResponse;
