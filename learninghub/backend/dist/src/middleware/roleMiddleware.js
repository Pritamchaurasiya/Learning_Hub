"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireInstructorOrAdmin = exports.requireAdmin = exports.requireRole = void 0;
/**
 * Role-based access control middleware
 *
 * IMPORTANT: Prisma UserRole enum values are UPPERCASE: STUDENT, INSTRUCTOR, ADMIN, SUPERADMIN
 * All role checks MUST use uppercase comparison to match the database enum.
 *
 * @param roles - Array of allowed roles (case-insensitive for safety)
 */
const requireRole = (roles) => {
    // Normalize to uppercase at middleware creation time for safe comparison
    const normalizedRoles = roles.map(r => r.toUpperCase());
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }
        const userRole = req.user.role?.toUpperCase();
        if (!userRole || !normalizedRoles.includes(userRole)) {
            return res
                .status(403)
                .json({ status: 'error', message: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};
exports.requireRole = requireRole;
/**
 * Admin-only middleware
 * Accepts both ADMIN and SUPERADMIN roles
 */
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
    const userRole = req.user.role?.toUpperCase();
    if (userRole !== 'ADMIN' && userRole !== 'SUPERADMIN') {
        return res.status(403).json({ status: 'error', message: 'Admin access required' });
    }
    next();
};
exports.requireAdmin = requireAdmin;
/**
 * Instructor or Admin middleware
 */
const requireInstructorOrAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
    const userRole = req.user.role?.toUpperCase();
    if (!userRole || !['ADMIN', 'SUPERADMIN', 'INSTRUCTOR'].includes(userRole)) {
        return res.status(403).json({ status: 'error', message: 'Instructor or Admin access required' });
    }
    next();
};
exports.requireInstructorOrAdmin = requireInstructorOrAdmin;
