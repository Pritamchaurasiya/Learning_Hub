"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCourses = exports.createCourse = void 0;
const createCourse = (overrides = {}) => ({
    id: 'course-' + Math.random().toString(36).substring(7),
    title: 'Test Course',
    description: 'A test course description',
    shortDescription: null,
    phase: 'Foundation',
    duration: 3600,
    difficulty: 'Beginner',
    category: 'Web Development',
    content: '# Course Content',
    thumbnail: null,
    trailerVideo: null,
    instructorName: null,
    instructorBio: null,
    price: 0,
    originalPrice: null,
    rating: 4.5,
    reviewCount: 0,
    studentCount: 0,
    certificate: false,
    language: 'English',
    lastUpdated: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});
exports.createCourse = createCourse;
const createCourses = (count) => {
    return Array.from({ length: count }, (_, i) => (0, exports.createCourse)({
        id: `course-${i + 1}`,
        title: `Test Course ${i + 1}`,
    }));
};
exports.createCourses = createCourses;
