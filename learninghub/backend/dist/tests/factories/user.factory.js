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
    role: 'student',
    xp: 0,
    level: 1,
    streak: 0,
    lastActive: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});
exports.createUser = createUser;
const createAdmin = (overrides = {}) => (0, exports.createUser)({
    email: 'admin@example.com',
    username: 'adminuser',
    role: 'admin',
    ...overrides,
});
exports.createAdmin = createAdmin;
const createInstructor = (overrides = {}) => (0, exports.createUser)({
    email: 'instructor@example.com',
    username: 'instructoruser',
    role: 'instructor',
    ...overrides,
});
exports.createInstructor = createInstructor;
