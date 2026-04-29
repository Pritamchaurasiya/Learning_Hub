import { User } from '@prisma/client';

export const createUser = (overrides: Partial<User> = {}): User => ({
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

export const createAdmin = (overrides: Partial<User> = {}): User =>
  createUser({
    email: 'admin@example.com',
    username: 'adminuser',
    role: 'admin',
    ...overrides,
  });

export const createInstructor = (overrides: Partial<User> = {}): User =>
  createUser({
    email: 'instructor@example.com',
    username: 'instructoruser',
    role: 'instructor',
    ...overrides,
  });
