"use strict";
// Middleware exports for LearningHub backend
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = exports.requestLogger = exports.requestId = exports.authorizeSuperAdmin = exports.authorizeInstructor = exports.authorizeAdmin = exports.authorize = exports.optionalAuth = exports.authenticate = void 0;
var authMiddleware_1 = require("./authMiddleware");
Object.defineProperty(exports, "authenticate", { enumerable: true, get: function () { return authMiddleware_1.authenticate; } });
Object.defineProperty(exports, "optionalAuth", { enumerable: true, get: function () { return authMiddleware_1.optionalAuth; } });
Object.defineProperty(exports, "authorize", { enumerable: true, get: function () { return authMiddleware_1.authorize; } });
Object.defineProperty(exports, "authorizeAdmin", { enumerable: true, get: function () { return authMiddleware_1.authorizeAdmin; } });
Object.defineProperty(exports, "authorizeInstructor", { enumerable: true, get: function () { return authMiddleware_1.authorizeInstructor; } });
Object.defineProperty(exports, "authorizeSuperAdmin", { enumerable: true, get: function () { return authMiddleware_1.authorizeSuperAdmin; } });
Object.defineProperty(exports, "requestId", { enumerable: true, get: function () { return authMiddleware_1.requestId; } });
Object.defineProperty(exports, "requestLogger", { enumerable: true, get: function () { return authMiddleware_1.requestLogger; } });
var errorHandler_1 = require("./errorHandler");
Object.defineProperty(exports, "errorHandler", { enumerable: true, get: function () { return errorHandler_1.errorHandler; } });
Object.defineProperty(exports, "notFoundHandler", { enumerable: true, get: function () { return errorHandler_1.notFoundHandler; } });
