"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.expectForbidden = exports.expectUnauthorized = exports.expectError = exports.expectSuccess = exports.authenticatedRequest = exports.createTestApp = void 0;
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
// Create a test app with specific routes
const createTestApp = (routes) => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use(routes);
    return app;
};
exports.createTestApp = createTestApp;
// Helper for making authenticated requests
const authenticatedRequest = (app, method, path, token, body) => {
    const req = (0, supertest_1.default)(app)[method](path).set('Authorization', `Bearer ${token}`);
    if (body) {
        req.send(body);
    }
    return req;
};
exports.authenticatedRequest = authenticatedRequest;
// Common response assertions
const expectSuccess = (response) => {
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
};
exports.expectSuccess = expectSuccess;
const expectError = (response, statusCode) => {
    expect(response.status).toBe(statusCode);
    expect(response.body.status).toBe('error');
};
exports.expectError = expectError;
const expectUnauthorized = (response) => {
    (0, exports.expectError)(response, 401);
};
exports.expectUnauthorized = expectUnauthorized;
const expectForbidden = (response) => {
    (0, exports.expectError)(response, 403);
};
exports.expectForbidden = expectForbidden;
