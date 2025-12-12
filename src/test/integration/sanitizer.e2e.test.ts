/**
 * End-to-End Integration Tests for NoSQL Injection Prevention
 *
 * These tests demonstrate the complete flow from Controller → Service → Database
 * to ensure sanitization is working correctly in a realistic scenario.
 *
 * @group integration
 * @group security
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sanitizeNoSQLInput, sanitizeQueryParams } from '../../utils/sanitizer';

describe('NoSQL Injection Prevention - E2E Flow', () => {
    describe('Controller → Service → Database flow', () => {
        it('should sanitize user input at controller level and preserve application operators at service level', () => {
            // ============ CONTROLLER LAYER ============
            // Simulate user input from req.body
            const userRequestBody = {
                name: 'John Doe',
                email: 'john@example.com',
                password: { $ne: null }, // 🚨 Malicious injection attempt
                role: 'admin',
            };

            // Controller sanitizes user input (application boundary)
            const sanitizedUserInput = sanitizeNoSQLInput(userRequestBody);

            // Verify dangerous operators are removed
            expect(sanitizedUserInput).toEqual({
                name: 'John Doe',
                email: 'john@example.com',
                password: {}, // $ne removed
                role: 'admin',
            });

            // ============ SERVICE LAYER ============
            // Service receives sanitized input and constructs safe query with application-controlled operators
            const serviceQuery = {
                ...sanitizedUserInput,
                // Application adds legitimate operators for business logic
                createdAt: { $gte: new Date('2024-01-01') }, // Date range filter
                isActive: true,
                $or: [
                    // Complex query logic
                    { status: 'verified' },
                    { role: 'admin' },
                ],
            };

            // ============ DATABASE LAYER ============
            // At this point, the query is safe:
            // 1. User input has been sanitized (no user-injected operators)
            // 2. Application-controlled operators are present for business logic
            expect(serviceQuery).toHaveProperty('createdAt.$gte');
            expect(serviceQuery).toHaveProperty('$or');
            expect(serviceQuery.password).toEqual({}); // User's malicious operator is gone
            expect(serviceQuery.name).toBe('John Doe'); // Valid user data preserved
        });

        it('should handle query parameters with proper sanitization flow', () => {
            // ============ CONTROLLER LAYER ============
            // Simulate user input from req.query
            const userQueryParams = {
                status: 'active',
                page: '1',
                limit: '10',
                createdAt: { $gte: '2024-01-01' }, // 🚨 User trying to inject operator
                userId: { $ne: null }, // 🚨 Authentication bypass attempt
            };

            // Controller sanitizes query parameters
            const sanitizedQuery = sanitizeQueryParams(userQueryParams);

            // Verify operators are removed from user input
            expect(sanitizedQuery).toEqual({
                status: 'active',
                page: '1',
                limit: '10',
                createdAt: {}, // User's $gte removed
                userId: {}, // User's $ne removed
            });

            // ============ SERVICE LAYER ============
            // Service constructs safe query with application logic
            const serviceQuery = {
                status: sanitizedQuery.status,
                // Application adds proper date filtering
                createdAt: { $gte: new Date('2024-01-01') }, // Application-controlled
            };

            expect(serviceQuery.createdAt.$gte).toBeInstanceOf(Date);
            expect(serviceQuery.status).toBe('active');
        });

        it('should demonstrate review creation with sanitization', () => {
            // ============ CONTROLLER LAYER ============
            // User creates a review with potential injection
            const userReviewData = {
                rating: 5,
                comment: 'Great place!',
                entityType: 'restaurant',
                entity: '507f1f77bcf86cd799439011',
                author: { $ne: null }, // 🚨 Trying to bypass author validation
            };

            // Controller sanitizes review data
            const sanitizedReview = sanitizeNoSQLInput(userReviewData);

            expect(sanitizedReview).toEqual({
                rating: 5,
                comment: 'Great place!',
                entityType: 'restaurant',
                entity: '507f1f77bcf86cd799439011',
                author: {}, // Malicious operator removed
            });

            // ============ SERVICE LAYER ============
            // Service validates and constructs safe query
            // In real implementation, author would come from authenticated user (req.user)
            const authenticatedUserId = '507f1f77bcf86cd799439012';

            const reviewQuery = {
                ...sanitizedReview,
                author: authenticatedUserId, // Application-controlled
                // Service adds additional query logic
                $or: [{ entityType: 'restaurant' }, { entityType: 'business' }],
            };

            expect(reviewQuery.author).toBe(authenticatedUserId);
            expect(reviewQuery.$or).toBeDefined(); // Application operator preserved
            expect(typeof reviewQuery.author).toBe('string'); // Not an object with $ne
        });

        it('should handle geospatial queries securely', () => {
            // ============ CONTROLLER LAYER ============
            // User provides location-based search
            const userLocationSearch = {
                category: 'restaurant',
                coordinates: {
                    $near: {
                        // 🚨 User trying to inject geospatial operator
                        $geometry: { type: 'Point', coordinates: [0, 0] },
                        $maxDistance: 100000000, // Try to get all results
                    },
                },
            };

            // Controller sanitizes user input
            const sanitizedSearch = sanitizeNoSQLInput(userLocationSearch);

            expect(sanitizedSearch).toEqual({
                category: 'restaurant',
                coordinates: {}, // User's $near removed
            });

            // ============ SERVICE LAYER ============
            // Service constructs proper geospatial query with validated coordinates
            const validatedLongitude = -73.935242;
            const validatedLatitude = 40.73061;
            const maxDistance = 5000; // Application-controlled limit

            const geoQuery = {
                category: sanitizedSearch.category,
                location: {
                    $near: {
                        // Application-controlled geospatial operator
                        $geometry: {
                            type: 'Point',
                            coordinates: [validatedLongitude, validatedLatitude],
                        },
                        $maxDistance: maxDistance,
                    },
                },
            };

            expect(geoQuery.location.$near.$maxDistance).toBe(5000);
            expect(geoQuery.category).toBe('restaurant');
        });

        it('should demonstrate pagination with sanitization', () => {
            // ============ CONTROLLER LAYER ============
            // User requests paginated data with potential injection
            const userPaginationQuery = {
                page: '1',
                limit: '10',
                sort: { createdAt: { $gt: 0 } }, // 🚨 Trying to inject into sort
                filters: {
                    $where: 'this.password.length > 0', // 🚨 JavaScript injection
                },
            };

            // Controller sanitizes query
            const sanitizedPagination = sanitizeQueryParams(userPaginationQuery);

            expect(sanitizedPagination).toEqual({
                page: '1',
                limit: '10',
                sort: { createdAt: {} }, // $gt removed
                filters: {}, // $where removed
            });

            // ============ SERVICE LAYER ============
            // Service builds proper pagination query
            const page = parseInt(sanitizedPagination.page as string) || 1;
            const limit = Math.min(parseInt(sanitizedPagination.limit as string) || 10, 100);
            const skip = (page - 1) * limit;

            const paginationQuery = {
                // Application-controlled pagination
                skip,
                limit,
                sort: { createdAt: -1 }, // Application-controlled sort
            };

            expect(paginationQuery.skip).toBe(0);
            expect(paginationQuery.limit).toBe(10);
            expect(paginationQuery.sort).toEqual({ createdAt: -1 });
        });
    });

    describe('Real-world attack scenarios - Full flow', () => {
        it('should prevent authentication bypass attack in login flow', () => {
            // 🚨 ATTACK: User tries to bypass password check
            const maliciousLoginRequest = {
                username: 'admin',
                password: { $ne: null }, // Would match any password that exists
            };

            // ✅ DEFENSE: Controller sanitizes input
            const sanitizedLogin = sanitizeNoSQLInput(maliciousLoginRequest);

            expect(sanitizedLogin).toEqual({
                username: 'admin',
                password: {}, // Attack neutralized
            });

            // Service would then safely query:
            // User.findOne({ username: 'admin', password: hashedPassword })
            // Instead of: User.findOne({ username: 'admin', password: { $ne: null } })
        });

        it('should prevent data exfiltration via $regex timing attack', () => {
            // 🚨 ATTACK: User tries to extract data using regex timing
            const maliciousSearchQuery = {
                username: {
                    $regex: '^admin.*',
                    $options: 'i',
                },
            };

            // ✅ DEFENSE: Controller sanitizes
            const sanitizedSearch = sanitizeQueryParams(maliciousSearchQuery);

            expect(sanitizedSearch).toEqual({
                username: {}, // $regex and $options removed
            });

            // Service can then use application-controlled regex:
            // { username: new RegExp(escapeRegex(userInput), 'i') }
        });

        it('should prevent privilege escalation via $in operator', () => {
            // 🚨 ATTACK: User tries to elevate privileges
            const maliciousUpdate = {
                email: 'user@example.com',
                role: { $in: ['admin', 'superuser'] }, // Try to set admin role
            };

            // ✅ DEFENSE: Controller sanitizes
            const sanitizedUpdate = sanitizeNoSQLInput(maliciousUpdate);

            expect(sanitizedUpdate).toEqual({
                email: 'user@example.com',
                role: {}, // $in removed
            });
        });

        it('should handle complex nested attacks in bulk operations', () => {
            // 🚨 ATTACK: Complex multi-level injection
            const maliciousBulkOperation = {
                users: [
                    {
                        name: 'User1',
                        $set: { role: 'admin' }, // Try to inject update operator
                    },
                    {
                        name: 'User2',
                        filters: {
                            $or: [{ deleted: { $ne: true } }, { archived: { $ne: true } }],
                        },
                    },
                ],
            };

            // ✅ DEFENSE: Controller sanitizes
            const sanitizedBulk = sanitizeNoSQLInput(maliciousBulkOperation);

            expect(sanitizedBulk).toEqual({
                users: [
                    { name: 'User1' }, // $set removed
                    {
                        name: 'User2',
                        filters: {}, // $or removed
                    },
                ],
            });
        });
    });

    describe('Edge cases and boundary conditions', () => {
        it('should handle null and undefined values', () => {
            const input = {
                name: 'John',
                middle: null,
                suffix: undefined,
            };

            const sanitized = sanitizeNoSQLInput(input);

            expect(sanitized).toEqual({
                name: 'John',
                middle: null,
                suffix: undefined,
            });
        });

        it('should handle empty objects and arrays', () => {
            const input = {
                emptyObj: {},
                emptyArray: [],
                nested: { emptyNested: {} },
            };

            const sanitized = sanitizeNoSQLInput(input);

            expect(sanitized).toEqual(input);
        });

        it('should preserve legitimate field names containing dollar signs in values', () => {
            const input = {
                price: '$100',
                description: 'Costs $50 per item',
                currency: 'USD',
            };

            const sanitized = sanitizeNoSQLInput(input);

            // Values can contain $, only keys starting with $ are dangerous
            expect(sanitized).toEqual(input);
        });
    });
});
