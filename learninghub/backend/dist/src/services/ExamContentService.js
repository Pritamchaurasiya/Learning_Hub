"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExamContentService = void 0;
const prismaClient_1 = require("../prismaClient");
class ExamContentService {
    async getPYQs(filters) {
        const { page = 1, limit = 20, subject, ...where } = filters;
        const prismaWhere = { ...where };
        if (subject) {
            prismaWhere.subjectName = { contains: subject, mode: 'insensitive' };
        }
        const [data, total] = await Promise.all([
            prismaClient_1.prisma.pYQ.findMany({
                where: prismaWhere,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { year: 'desc' },
            }),
            prismaClient_1.prisma.pYQ.count({ where: prismaWhere }),
        ]);
        return {
            data,
            meta: { total, page, limit, pages: Math.ceil(total / limit) },
        };
    }
    async createPYQ(data) {
        return prismaClient_1.prisma.pYQ.create({
            data: {
                examType: data.examType,
                year: data.year,
                paper: data.paper,
                subjectName: data.subject,
                question: data.question,
                options: data.options,
                answer: data.answer,
                explanation: data.explanation,
                difficulty: data.difficulty,
                marks: data.marks,
                negativeMarks: data.negativeMarks,
                tags: data.tags,
            },
        });
    }
    async getPYQById(id) {
        return prismaClient_1.prisma.pYQ.findUnique({ where: { id } });
    }
    async getFormulas(filters) {
        const { subject, ...where } = filters;
        const prismaWhere = { ...where };
        if (subject) {
            prismaWhere.topic = { contains: subject, mode: 'insensitive' };
        }
        return prismaClient_1.prisma.formula.findMany({ where: prismaWhere, orderBy: { createdAt: 'desc' } });
    }
    async getRevisionNotes(filters) {
        const { subject, ...where } = filters;
        const prismaWhere = { ...where };
        if (subject) {
            prismaWhere.topic = { contains: subject, mode: 'insensitive' };
        }
        return prismaClient_1.prisma.revisionNote.findMany({
            where: prismaWhere,
            orderBy: { createdAt: 'desc' },
        });
    }
}
exports.ExamContentService = ExamContentService;
