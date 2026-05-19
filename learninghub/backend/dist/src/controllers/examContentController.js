"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.examContentController = void 0;
const ExamContentService_1 = require("../services/ExamContentService");
const logger_1 = __importDefault(require("../utils/logger"));
const examContentService = new ExamContentService_1.ExamContentService();
exports.examContentController = {
    // PYQ Routes
    getPYQs: async (req, res) => {
        try {
            const result = await examContentService.getPYQs(req.query);
            res.json({ status: 'success', ...result });
        }
        catch (error) {
            logger_1.default.error('[ExamContent] getPYQs failed', error instanceof Error ? error : new Error(String(error)));
            res.status(500).json({ status: 'error', message: 'Failed to fetch PYQs' });
        }
    },
    getPYQById: async (req, res) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const pyq = await examContentService.getPYQById(id);
            if (!pyq) {
                return res.status(404).json({ status: 'error', message: 'PYQ not found' });
            }
            res.json({ status: 'success', data: pyq });
        }
        catch (error) {
            logger_1.default.error('[ExamContent] getPYQById failed', error instanceof Error ? error : new Error(String(error)), { pyqId: req.params.id });
            res.status(500).json({ status: 'error', message: 'Failed to fetch PYQ' });
        }
    },
    createPYQ: async (req, res) => {
        try {
            const pyq = await examContentService.createPYQ(req.body);
            res.status(201).json({ status: 'success', data: pyq });
        }
        catch (error) {
            logger_1.default.error('[ExamContent] createPYQ failed', error instanceof Error ? error : new Error(String(error)));
            res.status(500).json({ status: 'error', message: 'Failed to create PYQ' });
        }
    },
    // Formula Routes
    getFormulas: async (req, res) => {
        try {
            const formulas = await examContentService.getFormulas(req.query);
            res.json({ status: 'success', data: formulas });
        }
        catch (error) {
            logger_1.default.error('[ExamContent] getFormulas failed', error instanceof Error ? error : new Error(String(error)));
            res.status(500).json({ status: 'error', message: 'Failed to fetch formulas' });
        }
    },
    // Revision Notes Routes
    getRevisionNotes: async (req, res) => {
        try {
            const notes = await examContentService.getRevisionNotes(req.query);
            res.json({ status: 'success', data: notes });
        }
        catch (error) {
            logger_1.default.error('[ExamContent] getRevisionNotes failed', error instanceof Error ? error : new Error(String(error)));
            res.status(500).json({ status: 'error', message: 'Failed to fetch notes' });
        }
    },
};
