"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sanitizeMiddleware_1 = require("../../src/middleware/sanitizeMiddleware");
describe('sanitizeMiddleware', () => {
    it('sanitizes query values without assigning to the getter-only req.query property', () => {
        const query = { q: '<script>alert(1)</script>', safe: 'math' };
        const req = {};
        Object.defineProperty(req, 'query', {
            get: () => query,
            configurable: true,
        });
        req.body = { title: 'javascript:alert(1)' };
        req.params = { id: '<abc>' };
        const next = jest.fn();
        expect(() => (0, sanitizeMiddleware_1.sanitizeMiddleware)(req, {}, next)).not.toThrow();
        expect(req.query).toEqual({ q: '<script>alert(1)</script>', safe: 'math' });
        expect(req.body).toEqual({ title: 'alert(1)' });
        expect(req.params).toEqual({ id: '<abc>' });
        expect(next).toHaveBeenCalledTimes(1);
    });
});
