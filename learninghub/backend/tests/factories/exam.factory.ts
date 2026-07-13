import { Exam, Subject, Topic, Country } from '@prisma/client'

export const createCountry = (overrides: Partial<Country> = {}): Country => ({
  id: 'country-' + Math.random().toString(36).substring(7),
  code: 'US',
  name: 'United States',
  flagEmoji: '🇺🇸',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createExam = (overrides: Partial<Exam> = {}): Exam => ({
  id: 'exam-' + Math.random().toString(36).substring(7),
  countryId: 'country-123',
  name: 'Sample Exam',
  slug: 'sample-exam',
  description: 'A sample exam description',
  pattern: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

export const createSubject = (overrides: Partial<Subject> = {}): Subject => ({
  id: 'subject-' + Math.random().toString(36).substring(7),
  examId: 'exam-123',
  name: 'Sample Subject',
  slug: 'sample-subject',
  icon: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

export const createTopic = (overrides: Partial<Topic> = {}): Topic => ({
  id: 'topic-' + Math.random().toString(36).substring(7),
  subjectId: 'subject-123',
  name: 'Sample Topic',
  slug: 'sample-topic',
  order: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})
