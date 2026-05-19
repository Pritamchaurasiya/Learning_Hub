"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
require("dotenv/config");
const logger_1 = __importDefault(require("./utils/logger"));
logger_1.default.debug('Prisma Debug Info', {
    engineType: process.env.PRISMA_CLIENT_ENGINE_TYPE,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
});
try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const prisma = new client_1.PrismaClient();
    logger_1.default.info('Prisma initialized successfully');
    process.exit(0);
}
catch (error) {
    logger_1.default.error('Failed to initialize Prisma', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
}
