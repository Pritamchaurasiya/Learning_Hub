"use strict";
/**
 * Unified Prisma Client Export
 *
 * All imports should use this file. It re-exports the extended Prisma client
 * from config/database.ts which includes query logging, transaction retry,
 * connection pooling, and health checks.
 *
 * DO NOT create additional PrismaClient instances elsewhere.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.prisma = void 0;
var database_1 = require("./config/database");
Object.defineProperty(exports, "prisma", { enumerable: true, get: function () { return database_1.prisma; } });
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(database_1).default; } });
