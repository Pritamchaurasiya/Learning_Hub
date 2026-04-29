"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireInstructorOrAdmin = exports.requireAdmin = exports.requireRole = void 0;
/**
 * Role-based access control middleware
 * @param roles - Array of allowed roles
 */
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ status: 'error', message: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};
exports.requireRole = requireRole;
/**
 * Admin-only middleware
 */
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
    if (req.user.role !== 'admin') {
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
    if (!['admin', 'instructor'].includes(req.user.role)) {
        return res.status(403).json({ status: 'error', message: 'Instructor or Admin access required' });
    }
    next();
};
exports.requireInstructorOrAdmin = requireInstructorOrAdmin;
