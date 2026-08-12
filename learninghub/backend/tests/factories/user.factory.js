"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInstructor = exports.createAdmin = exports.createUser = void 0;
const createUser = (overrides = {}) => ({
    id: 'user-' + Math.random().toString(36).substring(7),
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashedpassword123',
    avatar: null,
    bio: null,
    location: null,
    website: null,
    role: 'STUDENT',
    xp: 0,
    level: 1,
    streak: 0,
    longestStreak: 0,
    lastActive: new Date(),
    lastLoginAt: null,
    loginCount: 0,
    failedLogins: 0,
    preferredLanguage: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
    lockedUntil: null,
    emailVerified: false,
    emailVerifiedAt: null,
    mfaEnabled: false,
    mfaSecret: null,
    deletedAt: null,
    dateOfBirth: null,
    timezone: 'UTC',
    countryId: null,
    ...overrides,
});
exports.createUser = createUser;
const createAdmin = (overrides = {}) => (0, exports.createUser)({
    email: 'admin@example.com',
    username: 'adminuser',
    role: 'ADMIN',
    ...overrides,
});
exports.createAdmin = createAdmin;
const createInstructor = (overrides = {}) => (0, exports.createUser)({
    email: 'instructor@example.com',
    username: 'instructoruser',
    role: 'INSTRUCTOR',
    ...overrides,
});
exports.createInstructor = createInstructor;
