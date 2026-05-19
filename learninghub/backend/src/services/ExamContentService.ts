import { ExamType } from '@prisma/client'
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
        where: prismaWhere as any,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { year: 'desc' },
      }),
      prisma.pYQ.count({ where: prismaWhere as any }),
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
    return prisma.formula.findMany({ where: prismaWhere as any, orderBy: { createdAt: 'desc' } })
  }

  async getRevisionNotes(filters: { examType?: ExamType; subject?: string; topic?: string }) {
    const { subject, ...where } = filters
    const prismaWhere: Record<string, unknown> = { ...where }
    if (subject) {
      prismaWhere.topic = { contains: subject, mode: 'insensitive' }
    }
    return prisma.revisionNote.findMany({
      where: prismaWhere as any,
      orderBy: { createdAt: 'desc' },
    })
  }
}
