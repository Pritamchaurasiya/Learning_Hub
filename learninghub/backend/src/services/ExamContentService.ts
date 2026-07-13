import { ExamType, Prisma } from '@prisma/client'
import { prisma } from '../prismaClient'

export interface CreatePYQDTO {
  examType: ExamType
  year: number
  paper: string
  subject: string
  question: string
  options: string[]
  answer: string
  explanation: string
  difficulty: string
  marks: number
  negativeMarks: number
  tags: string[]
}

export class ExamContentService {
  async getPYQs(filters: {
    examType?: ExamType
    year?: number
    subject?: string
    difficulty?: string
    page?: number
    limit?: number
  }) {
    const { page = 1, limit = 20, subject, ...where } = filters

    const prismaWhere: Record<string, unknown> = { ...where }
    if (subject) {
      prismaWhere.subjectName = { contains: subject, mode: 'insensitive' }
    }

    const [data, total] = await Promise.all([
      prisma.pYQ.findMany({
        where: prismaWhere as Prisma.PYQWhereInput,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { year: 'desc' },
      }),
      prisma.pYQ.count({ where: prismaWhere as Prisma.PYQWhereInput }),
    ])

    return {
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    }
  }

  async createPYQ(data: CreatePYQDTO) {
    return prisma.pYQ.create({
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
    })
  }

  async getPYQById(id: string) {
    return prisma.pYQ.findUnique({ where: { id } })
  }

  async getFormulas(filters: { examType?: ExamType; subject?: string; topic?: string }) {
    const { subject, ...where } = filters
    const prismaWhere: Record<string, unknown> = { ...where }
    if (subject) {
      prismaWhere.topic = { contains: subject, mode: 'insensitive' }
    }
    return prisma.formula.findMany({
      where: prismaWhere as Prisma.FormulaWhereInput,
      orderBy: { createdAt: 'desc' },
    })
  }

  async getRevisionNotes(filters: { examType?: ExamType; subject?: string; topic?: string }) {
    const { subject, ...where } = filters
    const prismaWhere: Record<string, unknown> = { ...where }
    if (subject) {
      prismaWhere.topic = { contains: subject, mode: 'insensitive' }
    }
    return prisma.revisionNote.findMany({
      where: prismaWhere as Prisma.RevisionNoteWhereInput,
      orderBy: { createdAt: 'desc' },
    })
  }

  async getCountries() {
    return prisma.country.findMany({
      where: { isActive: true },
      include: {
        exams: {
          where: { isActive: true },
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { name: 'asc' },
    })
  }

  async getExams(filters: { countryId?: string; search?: string }) {
    const where: Prisma.ExamWhereInput = { isActive: true, deletedAt: null }
    if (filters.countryId) {
      where.countryId = filters.countryId
    }
    if (filters.search?.trim()) {
      where.OR = [
        { name: { contains: filters.search.trim(), mode: 'insensitive' } },
        { description: { contains: filters.search.trim(), mode: 'insensitive' } },
      ]
    }
    return prisma.exam.findMany({
      where,
      include: {
        subjects: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { name: 'asc' },
    })
  }

  async getSubjects(examId: string) {
    return prisma.subject.findMany({
      where: { examId, deletedAt: null },
      include: {
        topics: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { name: 'asc' },
    })
  }
}
