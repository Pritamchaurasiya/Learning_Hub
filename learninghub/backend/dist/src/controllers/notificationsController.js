"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getUnreadCount = exports.getNotifications = void 0;
const NotificationService_1 = require("../services/NotificationService");
const logger_1 = __importDefault(require("../utils/logger"));
const getNotifications = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '20', 10);
        const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;
        const type = req.query.type;
        const result = await NotificationService_1.notificationService.getUserNotifications(userId, page, limit, {
            isRead,
            type,
        });
        res.json({
            status: 'success',
            data: result.notifications,
            pagination: {
                page,
                limit,
                total: result.total,
                pages: Math.ceil(result.total / limit),
            },
            meta: {
                unreadCount: result.unreadCount,
            },
        });
    }
    catch (error) {
        logger_1.default.error('[NotificationsController] getNotifications error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getNotifications = getNotifications;
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const count = await NotificationService_1.notificationService.getUnreadCount(userId);
        res.json({
            status: 'success',
            data: { count },
        });
    }
    catch (error) {
        logger_1.default.error('[NotificationsController] getUnreadCount error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getUnreadCount = getUnreadCount;
const markAsRead = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const id = req.params.id;
        const notification = await NotificationService_1.notificationService.markAsRead(id, userId);
        res.json({
            status: 'success',
            data: notification,
        });
    }
    catch (error) {
        logger_1.default.error('[NotificationsController] markAsRead error', error instanceof Error ? error : new Error(String(error)));
        res.status(404).json({ status: 'error', message: 'Notification not found' });
    }
};
exports.markAsRead = markAsRead;
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const result = await NotificationService_1.notificationService.markAllAsRead(userId);
        res.json({
            status: 'success',
            data: result,
        });
    }
    catch (error) {
        logger_1.default.error('[NotificationsController] markAllAsRead error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.markAllAsRead = markAllAsRead;
const deleteNotification = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const id = req.params.id;
        await NotificationService_1.notificationService.deleteNotification(id, userId);
        res.json({
            status: 'success',
            message: 'Notification deleted',
        });
    }
    catch (error) {
        logger_1.default.error('[NotificationsController] deleteNotification error', error instanceof Error ? error : new Error(String(error)));
        res.status(404).json({ status: 'error', message: 'Notification not found' });
    }
};
exports.deleteNotification = deleteNotification;
