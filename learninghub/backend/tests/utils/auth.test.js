"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("../../src/utils/auth");
describe('auth utilities', () => {
    describe('hashToken', () => {
        it('produces a 64-character hex string', () => {
            const hash = (0, auth_1.hashToken)('test-token');
            expect(hash).toHaveLength(64);
            expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
        });
        it('produces consistent output for same input', () => {
            const hash1 = (0, auth_1.hashToken)('consistent-token');
            const hash2 = (0, auth_1.hashToken)('consistent-token');
            expect(hash1).toBe(hash2);
        });
        it('produces different output for different inputs', () => {
            const hash1 = (0, auth_1.hashToken)('token-1');
            const hash2 = (0, auth_1.hashToken)('token-2');
            expect(hash1).not.toBe(hash2);
        });
    });
    describe('isAlreadyHashed', () => {
        it('returns true for valid SHA256 hex strings', () => {
            const validHash = 'a'.repeat(64); // 64 hex characters
            expect((0, auth_1.isAlreadyHashed)(validHash)).toBe(true);
        });
        it('returns true for actual SHA256 hash output', () => {
            const hash = (0, auth_1.hashToken)('some-token');
            expect((0, auth_1.isAlreadyHashed)(hash)).toBe(true);
        });
        it('returns false for plaintext tokens', () => {
            expect((0, auth_1.isAlreadyHashed)('plaintext-token')).toBe(false);
            expect((0, auth_1.isAlreadyHashed)('abc123')).toBe(false);
        });
        it('returns false for strings with wrong length', () => {
            expect((0, auth_1.isAlreadyHashed)('a'.repeat(63))).toBe(false);
            expect((0, auth_1.isAlreadyHashed)('a'.repeat(65))).toBe(false);
        });
        it('returns false for strings with non-hex characters', () => {
            const longString = 'g' + 'a'.repeat(63); // 'g' is not hex
            expect((0, auth_1.isAlreadyHashed)(longString)).toBe(false);
        });
        it('handles mixed case hex strings', () => {
            const upperHex = 'A'.repeat(64);
            const mixedHex = 'aAbBcC'.repeat(10) + 'aAbBcC'.slice(0, 4); // Exactly 64 chars
            expect((0, auth_1.isAlreadyHashed)(upperHex)).toBe(true);
            expect((0, auth_1.isAlreadyHashed)(mixedHex)).toBe(true);
        });
    });
});
