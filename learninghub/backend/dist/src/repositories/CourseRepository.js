"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
class CourseRepository extends BaseRepository_1.BaseRepository {
    async findById(id, includeRelations = false) {
        return this.prisma.course.findUnique({
            where: { id, deletedAt: null },
            include: includeRelations
                ? {
                    instructor: {
                        select: {
                            id: true,
                            username: true,
                            avatar: true,
                            bio: true,
                        },
                    },
                    modules: {
                        orderBy: { order: 'asc' },
                        include: {
                            lessons: {
                                orderBy: { order: 'asc' },
                            },
                        },
                    },
                    reviews: {
                        where: { isVisible: true },
                        take: 5,
                        orderBy: { createdAt: 'desc' },
                        include: {
                            reviewer: {
                                select: {
                                    id: true,
                                    username: true,
                                    avatar: true,
                                },
                            },
                        },
                    },
                    tests: {
                        select: {
                            id: true,
                            title: true,
                            description: true,
                            timeLimit: true,
                            passingScore: true,
                        },
                    },
                }
                : undefined,
        });
    }
    async findManyList(params = {}) {
        const { page, limit, skip } = this.buildPaginationParams(params);
        const where = {
            deletedAt: null,
            isPublished: params.isPublished ?? true,
            ...(params.phase && { phase: params.phase }),
            ...(params.difficulty && { difficulty: params.difficulty }),
            ...(params.category && { category: { equals: params.category, mode: 'insensitive' } }),
            ...(params.tags &&
                params.tags.length > 0 && {
                tags: { hasEvery: params.tags },
            }),
            ...(params.instructorId && { instructorId: params.instructorId }),
            ...(params.minPrice !== undefined && { price: { gte: params.minPrice } }),
            ...(params.maxPrice !== undefined && { price: { lte: params.maxPrice } }),
            ...(params.hasCertificate !== undefined && { certificate: params.hasCertificate }),
            ...(params.search && {
                OR: [
                    { title: { contains: params.search, mode: 'insensitive' } },
                    { description: { contains: params.search, mode: 'insensitive' } },
                    { shortDescription: { contains: params.search, mode: 'insensitive' } },
                ],
            }),
        };
        const [total, data] = await Promise.all([
            this.prisma.course.count({ where }),
            this.prisma.course.findMany({
                where,
                skip,
                take: limit,
                orderBy: this.buildOrderBy(params.sortBy, params.sortOrder),
                select: {
                    id: true,
                    title: true,
                    shortDescription: true,
                    phase: true,
                    difficulty: true,
                    category: true,
                    tags: true,
                    thumbnail: true,
                    duration: true,
                    price: true,
                    originalPrice: true,
                    currency: true,
                    rating: true,
                    reviewCount: true,
                    studentCount: true,
                    certificate: true,
                    isPublished: true,
                    publishedAt: true,
                    createdAt: true,
                    updatedAt: true,
                    instructor: {
                        select: {
                            id: true,
                            username: true,
                            avatar: true,
                        },
                    },
                },
            }),
        ]);
        return this.buildPaginatedResponse(data, total, page, limit);
    }
    async create(data, tx) {
        const prisma = this.getPrismaInstance(tx);
        const courseData = {
            title: data.title,
            description: data.description,
            shortDescription: data.shortDescription,
            phase: data.phase,
            duration: data.duration,
            difficulty: data.difficulty,
            category: data.category,
            tags: data.tags ?? [],
            content: data.content,
            thumbnail: data.thumbnail,
            trailerVideo: data.trailerVideo,
            price: data.price ?? 0,
            originalPrice: data.originalPrice,
            currency: data.currency ?? 'USD',
            certificate: data.certificate ?? false,
            language: data.language ?? 'en',
            prerequisites: data.prerequisites ?? [],
            learningOutcomes: data.learningOutcomes ?? [],
            isPublished: data.isPublished ?? false,
            ...(data.instructorId && {
                instructor: { connect: { id: data.instructorId } },
            }),
        };
        return prisma.course.create({ data: courseData });
    }
    async update(id, data, tx) {
        const prisma = this.getPrismaInstance(tx);
        const updateData = {
            ...data,
            updatedAt: new Date(),
            ...(data.instructorId && {
                instructor: { connect: { id: data.instructorId } },
            }),
            ...(data.isPublished === true &&
                !data.publishedAt && {
                publishedAt: new Date(),
            }),
        };
        return prisma.course.update({
            where: { id },
            data: updateData,
        });
    }
    async delete(id, tx) {
        const prisma = this.getPrismaInstance(tx);
        await prisma.course.delete({ where: { id } });
    }
    async softDelete(id, tx) {
        const prisma = this.getPrismaInstance(tx);
        await prisma.course.update({
            where: { id },
            data: { deletedAt: new Date(), updatedAt: new Date() },
        });
    }
    async restore(id, tx) {
        const prisma = this.getPrismaInstance(tx);
        await prisma.course.update({
            where: { id },
            data: { deletedAt: null, updatedAt: new Date() },
        });
    }
    async publish(id, tx) {
        const prisma = this.getPrismaInstance(tx);
        return prisma.course.update({
            where: { id },
            data: {
                isPublished: true,
                publishedAt: new Date(),
                updatedAt: new Date(),
            },
        });
    }
    async unpublish(id, tx) {
        const prisma = this.getPrismaInstance(tx);
        return prisma.course.update({
            where: { id },
            data: {
                isPublished: false,
                updatedAt: new Date(),
            },
        });
    }
    async incrementStudentCount(id, tx) {
        const prisma = this.getPrismaInstance(tx);
        await prisma.course.update({
            where: { id },
            data: {
                studentCount: { increment: 1 },
                updatedAt: new Date(),
            },
        });
    }
    async decrementStudentCount(id, tx) {
        const prisma = this.getPrismaInstance(tx);
        await prisma.course.update({
            where: { id },
            data: {
                studentCount: { decrement: 1 },
                updatedAt: new Date(),
            },
        });
    }
    async updateRating(id, tx) {
        const prisma = this.getPrismaInstance(tx);
        // Calculate average rating from reviews
        const result = await prisma.courseReview.aggregate({
            where: { courseId: id, isVisible: true },
            _avg: { rating: true },
            _count: { rating: true },
        });
        await prisma.course.update({
            where: { id },
            data: {
                rating: result._avg.rating ?? 0,
                reviewCount: result._count.rating || 0,
                updatedAt: new Date(),
            },
        });
    }
    async findFeatured(limit = 6) {
        return this.prisma.course.findMany({
            where: {
                deletedAt: null,
                isPublished: true,
            },
            orderBy: [{ rating: 'desc' }, { studentCount: 'desc' }, { createdAt: 'desc' }],
            take: limit,
        });
    }
    async findByInstructor(instructorId, includeUnpublished = false) {
        return this.prisma.course.findMany({
            where: {
                deletedAt: null,
                instructorId,
                ...(includeUnpublished ? {} : { isPublished: true }),
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getCategories() {
        const result = await this.prisma.course.findMany({
            where: {
                deletedAt: null,
                isPublished: true,
                category: { not: null },
            },
            distinct: ['category'],
            select: { category: true },
        });
        return result.map(c => c.category).filter((c) => c !== null);
    }
    async getTags() {
        const result = await this.prisma.course.findMany({
            where: {
                deletedAt: null,
                isPublished: true,
            },
            select: { tags: true },
        });
        const allTags = result.flatMap(c => c.tags);
        return [...new Set(allTags)];
    }
}
exports.CourseRepository = CourseRepository;
