"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = exports.CourseRepository = exports.UserRepository = exports.RepositoryFactory = void 0;
const UserRepository_1 = require("./UserRepository");
Object.defineProperty(exports, "UserRepository", { enumerable: true, get: function () { return UserRepository_1.UserRepository; } });
const CourseRepository_1 = require("./CourseRepository");
Object.defineProperty(exports, "CourseRepository", { enumerable: true, get: function () { return CourseRepository_1.CourseRepository; } });
const BaseRepository_1 = require("./BaseRepository");
Object.defineProperty(exports, "BaseRepository", { enumerable: true, get: function () { return BaseRepository_1.BaseRepository; } });
// Export all repositories
__exportStar(require("./BaseRepository"), exports);
__exportStar(require("./UserRepository"), exports);
__exportStar(require("./CourseRepository"), exports);
// Repository factory for dependency injection
class RepositoryFactory {
    static instances = new Map();
    static getUserRepository(prisma) {
        if (!this.instances.has('userRepository')) {
            this.instances.set('userRepository', new UserRepository_1.UserRepository(prisma));
        }
        return this.instances.get('userRepository');
    }
    static getCourseRepository(prisma) {
        if (!this.instances.has('courseRepository')) {
            this.instances.set('courseRepository', new CourseRepository_1.CourseRepository(prisma));
        }
        return this.instances.get('courseRepository');
    }
    static clear() {
        this.instances.clear();
    }
}
exports.RepositoryFactory = RepositoryFactory;
