"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jest_mock_extended_1 = require("jest-mock-extended");
const coursesController_1 = require("../../src/controllers/coursesController");
const prismaClient_1 = require("../../src/prismaClient");
const course_factory_1 = require("../factories/course.factory");
jest.mock('../../src/utils/logger', () => ({
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
}));
describe('CoursesController', () => {
    let mockReq;
    let mockRes;
    let jsonMock;
    let statusMock;
    beforeEach(() => {
        jsonMock = jest.fn().mockReturnThis();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockReq = (0, jest_mock_extended_1.mockDeep)();
        mockRes = (0, jest_mock_extended_1.mockDeep)();
        mockRes.status = statusMock;
        mockRes.json = jsonMock;
        jest.clearAllMocks();
    });
    describe('listCourses', () => {
        it('should return list of courses', async () => {
            const courses = (0, course_factory_1.createCourses)(3);
            mockReq.query = {};
            prismaClient_1.prisma.course.findMany.mockResolvedValue(courses);
            prismaClient_1.prisma.course.count.mockResolvedValue(3);
            await (0, coursesController_1.listCourses)(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'success',
                data: expect.any(Array),
                meta: {
                    total: 3,
                    page: 1,
                    limit: 20,
                    pages: 1,
                    hasNext: false,
                    hasPrev: false,
                },
            });
        });
        it('should filter courses by search query', async () => {
            const courses = [(0, course_factory_1.createCourse)({ title: 'JavaScript Course' })];
            mockReq.query = { search: 'javascript' };
            prismaClient_1.prisma.course.findMany.mockResolvedValue(courses);
            prismaClient_1.prisma.course.count.mockResolvedValue(1);
            await (0, coursesController_1.listCourses)(mockReq, mockRes);
            expect(prismaClient_1.prisma.course.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    OR: expect.any(Array),
                }),
            }));
        });
        it('should filter courses by difficulty', async () => {
            const courses = [(0, course_factory_1.createCourse)({ difficulty: 'ADVANCED' })];
            mockReq.query = { difficulty: 'ADVANCED' };
            prismaClient_1.prisma.course.findMany.mockResolvedValue(courses);
            prismaClient_1.prisma.course.count.mockResolvedValue(1);
            await (0, coursesController_1.listCourses)(mockReq, mockRes);
            expect(prismaClient_1.prisma.course.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    difficulty: 'ADVANCED',
                }),
            }));
        });
    });
    describe('getCourseDetails', () => {
        it('should return course details with sections and lessons', async () => {
            const course = (0, course_factory_1.createCourse)({ id: 'course-123' });
            mockReq.params = { id: course.id };
            prismaClient_1.prisma.course.findUnique.mockResolvedValue(course);
            await (0, coursesController_1.getCourseDetails)(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(200);
            // Response should be transformed to CourseDetails shape
            const expectedData = expect.objectContaining({
                id: course.id,
                title: course.title,
                description: course.description,
                sections: expect.any(Array),
                instructor: expect.objectContaining({
                    display_name: expect.any(String),
                }),
            });
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'success',
                data: expectedData,
            });
        });
        it('should return 404 for non-existent course', async () => {
            mockReq.params = { id: 'non-existent' };
            prismaClient_1.prisma.course.findUnique.mockResolvedValue(null);
            await (0, coursesController_1.getCourseDetails)(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'error',
                message: 'Course not found',
            });
        });
    });
    describe('getCourseReviews', () => {
        it('should return empty reviews array', async () => {
            mockReq.params = { id: 'course-123' };
            prismaClient_1.prisma.course.findUnique.mockResolvedValue({
                reviewCount: 0,
                rating: 0,
            });
            await (0, coursesController_1.getCourseReviews)(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'success',
                data: [],
                meta: { total: 0, average_rating: 0, page: 1, pages: 0 },
            });
        });
    });
});
