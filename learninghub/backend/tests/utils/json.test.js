"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const json_1 = require("../../src/utils/json");
describe('json utilities', () => {
    describe('parseJsonObject', () => {
        it('returns objects unchanged', () => {
            expect((0, json_1.parseJsonObject)({ questionId: 'optionId' })).toEqual({ questionId: 'optionId' });
        });
        it('parses legacy stringified objects', () => {
            expect((0, json_1.parseJsonObject)('{"questionId":"optionId"}')).toEqual({ questionId: 'optionId' });
        });
        it('returns an empty object for invalid object values', () => {
            expect((0, json_1.parseJsonObject)('not-json')).toEqual({});
            expect((0, json_1.parseJsonObject)(['not', 'object'])).toEqual({});
        });
    });
    describe('parseJsonArray', () => {
        it('returns arrays unchanged', () => {
            expect((0, json_1.parseJsonArray)([{ question_id: 'q1' }])).toEqual([{ question_id: 'q1' }]);
        });
        it('parses legacy stringified arrays', () => {
            expect((0, json_1.parseJsonArray)('[{"question_id":"q1"}]')).toEqual([{ question_id: 'q1' }]);
        });
        it('returns an empty array for invalid array values', () => {
            expect((0, json_1.parseJsonArray)('not-json')).toEqual([]);
            expect((0, json_1.parseJsonArray)({ not: 'array' })).toEqual([]);
        });
    });
});
