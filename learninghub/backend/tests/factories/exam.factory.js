"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTopic = exports.createSubject = exports.createExam = exports.createCountry = void 0;
const createCountry = (overrides = {}) => ({
    id: 'country-' + Math.random().toString(36).substring(7),
    code: 'US',
    name: 'United States',
    flagEmoji: '🇺🇸',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});
exports.createCountry = createCountry;
const createExam = (overrides = {}) => ({
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
});
exports.createExam = createExam;
const createSubject = (overrides = {}) => ({
    id: 'subject-' + Math.random().toString(36).substring(7),
    examId: 'exam-123',
    name: 'Sample Subject',
    slug: 'sample-subject',
    icon: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
});
exports.createSubject = createSubject;
const createTopic = (overrides = {}) => ({
    id: 'topic-' + Math.random().toString(36).substring(7),
    subjectId: 'subject-123',
    name: 'Sample Topic',
    slug: 'sample-topic',
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
});
exports.createTopic = createTopic;
