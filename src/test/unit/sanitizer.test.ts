/**
 * Unit tests for NoSQL Injection Prevention
 *
 * @group unit
 * @group security
 */

import { describe, it, expect } from 'vitest';
import { sanitizeNoSQLInput, sanitizeQueryParams, isStringSafe } from '../../utils/sanitizer';

describe('NoSQL Injection Prevention', () => {
    describe('sanitizeNoSQLInput', () => {
        it('should remove MongoDB operators from top-level object', () => {
            const maliciousInput = {
                username: 'admin',
                password: { $ne: null },
            };

            const result = sanitizeNoSQLInput(maliciousInput);

            expect(result).toEqual({
                username: 'admin',
                password: {}, // $ne removed
            });
        });

        it('should handle nested MongoDB operators', () => {
            const maliciousInput = {
                user: {
                    email: 'test@example.com',
                    password: { $ne: null },
                },
            };

            const result = sanitizeNoSQLInput(maliciousInput);

            expect(result.user.email).toBe('test@example.com');
            expect(result.user.password).toEqual({});
        });

        it('should preserve valid data without operators', () => {
            const validInput = {
                name: 'John Doe',
                age: 30,
                email: 'john@example.com',
            };

            const result = sanitizeNoSQLInput(validInput);

            expect(result).toEqual(validInput);
        });

        it('should handle arrays correctly', () => {
            const inputWithArray = {
                tags: ['tag1', 'tag2'],
                filters: [{ $ne: 'bad' }, { status: 'good' }],
            };

            const result = sanitizeNoSQLInput(inputWithArray);

            expect(result.tags).toEqual(['tag1', 'tag2']);
            expect(result.filters[0]).toEqual({}); // $ne removed
            expect(result.filters[1]).toEqual({ status: 'good' });
        });

        it('should handle null and undefined', () => {
            expect(sanitizeNoSQLInput(null)).toBeNull();
            expect(sanitizeNoSQLInput(undefined)).toBeUndefined();
        });

        it('should handle primitive types', () => {
            expect(sanitizeNoSQLInput('string')).toBe('string');
            expect(sanitizeNoSQLInput(123)).toBe(123);
            expect(sanitizeNoSQLInput(true)).toBe(true);
        });

        it('should remove $where operator (code injection)', () => {
            const maliciousInput = {
                $where: 'this.password == "password"',
                username: 'admin',
            };

            const result = sanitizeNoSQLInput(maliciousInput);

            expect(result).toEqual({ username: 'admin' });
            expect(result).not.toHaveProperty('$where');
        });

        it('should remove $regex operator', () => {
            const maliciousInput = {
                username: { $regex: '.*' },
            };

            const result = sanitizeNoSQLInput(maliciousInput);

            expect(result.username).toEqual({});
        });

        it('should handle deeply nested objects', () => {
            const deeplyNested = {
                level1: {
                    level2: {
                        level3: {
                            $ne: 'malicious',
                            safe: 'value',
                        },
                    },
                },
            };

            const result = sanitizeNoSQLInput(deeplyNested);

            expect(result.level1.level2.level3).toEqual({ safe: 'value' });
        });
    });

    describe('sanitizeQueryParams', () => {
        it('should remove top-level MongoDB operators', () => {
            const maliciousQuery = {
                status: 'active',
                $where: 'malicious code',
            };

            const result = sanitizeQueryParams(maliciousQuery);

            expect(result).toEqual({ status: 'active' });
            expect(result).not.toHaveProperty('$where');
        });

        it('should sanitize nested operators in query values', () => {
            const query = {
                age: { $gt: 18, $lt: 65 },
            };

            const result = sanitizeQueryParams(query);

            expect(result.age).toEqual({});
        });

        it('should preserve valid query parameters', () => {
            const validQuery = {
                status: 'active',
                page: 1,
                limit: 10,
            };

            const result = sanitizeQueryParams(validQuery);

            expect(result).toEqual(validQuery);
        });
    });

    describe('isStringSafe', () => {
        it('should return true for safe strings', () => {
            expect(isStringSafe('normalUsername')).toBe(true);
            expect(isStringSafe('user@example.com')).toBe(true);
        });

        it('should return false for strings with MongoDB operators', () => {
            expect(isStringSafe('$where')).toBe(false);
            expect(isStringSafe('user$ne')).toBe(false);
            expect(isStringSafe('text$regex')).toBe(false);
        });
    });

    describe('Real-world attack scenarios', () => {
        it('should prevent authentication bypass with $ne', () => {
            // Common NoSQL injection for bypassing login
            const loginAttempt = {
                username: 'admin',
                password: { $ne: null }, // This would match any non-null password
            };

            const sanitized = sanitizeNoSQLInput(loginAttempt);

            expect(sanitized.password).toEqual({});
        });

        it('should prevent data extraction with $gt', () => {
            // Attempting to extract all users with ID greater than 0
            const query = {
                userId: { $gt: 0 },
            };

            const sanitized = sanitizeQueryParams(query);

            expect(sanitized.userId).toEqual({});
        });

        it('should prevent JavaScript injection with $where', () => {
            const injection = {
                $where: 'this.password.length > 0',
            };

            const sanitized = sanitizeNoSQLInput(injection);

            expect(sanitized).toEqual({});
        });

        it('should handle complex nested attack vectors', () => {
            const complexAttack = {
                user: {
                    $or: [{ username: 'admin' }, { email: 'admin@example.com' }],
                },
                filters: {
                    status: { $ne: 'deleted' },
                },
            };

            const sanitized = sanitizeNoSQLInput(complexAttack);

            expect(sanitized.user).toEqual({});
            expect(sanitized.filters.status).toEqual({});
        });
    });
});
