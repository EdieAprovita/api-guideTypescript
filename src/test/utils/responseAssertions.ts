import { vi, type MockedFunction } from 'vitest';
/**
 * Response Assertions Utility
 *
 * This module provides standardized response assertion functions
 * to eliminate duplicated validation logic across tests.
 */

import { Response } from 'supertest';

interface SuccessResponseExpectation {
    status?: number;
    hasData?: boolean;
    dataType?: 'object' | 'array' | 'string' | 'number' | 'boolean';
    requiredFields?: string[];
    customAssertions?: (response: any) => void;
}

interface ErrorResponseExpectation {
    status: number;
    hasMessage?: boolean;
    messagePattern?: RegExp | string;
    hasErrors?: boolean;
    customAssertions?: (response: any) => void;
}

interface PaginationExpectation {
    hasDocs?: boolean;
    hasTotal?: boolean;
    hasPageInfo?: boolean;
    minimumDocs?: number;
    maximumDocs?: number;
}

class ResponseAssertions {
    /**
     * Assert successful response structure
     */
    static expectSuccessResponse(response: Response, expectations: SuccessResponseExpectation = {}) {
        const {
            status = 200,
            hasData = true,
            dataType = 'object',
            requiredFields = [],
            customAssertions,
        } = expectations;

        expect(response.status).toBe(status);
        expect(response.body).toHaveProperty('success', true);

        if (hasData) {
            expect(response.body).toHaveProperty('data');

            switch (dataType) {
                case 'array':
                    expect(Array.isArray(response.body.data)).toBe(true);
                    break;
                case 'object':
                    expect(typeof response.body.data).toBe('object');
                    expect(response.body.data).not.toBeNull();
                    break;
                case 'string':
                    expect(typeof response.body.data).toBe('string');
                    break;
                case 'number':
                    expect(typeof response.body.data).toBe('number');
                    break;
                case 'boolean':
                    expect(typeof response.body.data).toBe('boolean');
                    break;
            }

            // Check required fields in data
            if (requiredFields.length > 0 && dataType === 'object') {
                requiredFields.forEach(field => {
                    expect(response.body.data).toHaveProperty(field);
                });
            }
        }

        if (customAssertions) {
            customAssertions(response.body);
        }
    }

    /**
     * Assert error response structure
     */
    static expectErrorResponse(response: Response, expectations: ErrorResponseExpectation) {
        const { status, hasMessage = true, messagePattern, hasErrors = false, customAssertions } = expectations;

        expect(response.status).toBe(status);
        expect(response.body).toHaveProperty('success', false);

        if (hasMessage) {
            expect(response.body).toHaveProperty('message');
            expect(typeof response.body.message).toBe('string');

            if (messagePattern) {
                if (messagePattern instanceof RegExp) {
                    expect(response.body.message).toMatch(messagePattern);
                } else {
                    expect(response.body.message).toContain(messagePattern);
                }
            }
        }

        if (hasErrors) {
            expect(response.body).toHaveProperty('errors');
            expect(Array.isArray(response.body.errors)).toBe(true);
        }

        if (customAssertions) {
            customAssertions(response.body);
        }
    }

    /**
     * Assert validation error response
     */
    static expectValidationError(response: Response, expectedFields?: string[]) {
        this.expectErrorResponse(response, {
            status: 400,
            hasMessage: true,
            hasErrors: true,
            customAssertions: body => {
                if (expectedFields) {
                    expectedFields.forEach(field => {
                        const hasFieldError = body.errors.some(
                            (error: any) => error.field === field || error.path === field
                        );
                        expect(hasFieldError).toBe(true);
                    });
                }
            },
        });
    }

    /**
     * Assert unauthorized response
     */
    static expectUnauthorizedResponse(response: Response) {
        this.expectErrorResponse(response, {
            status: 401,
            hasMessage: true,
            messagePattern: /unauthorized|authentication/i,
        });
    }

    /**
     * Assert forbidden response
     */
    static expectForbiddenResponse(response: Response) {
        this.expectErrorResponse(response, {
            status: 403,
            hasMessage: true,
            messagePattern: /forbidden|permission|access/i,
        });
    }

    /**
     * Assert not found response
     */
    static expectNotFoundResponse(response: Response, resourceType?: string) {
        this.expectErrorResponse(response, {
            status: 404,
            hasMessage: true,
            messagePattern: resourceType ? new RegExp(`${resourceType}.*not found`, 'i') : /not found/i,
        });
    }

    /**
     * Assert paginated response structure
     */
    static expectPaginatedResponse(response: Response, expectations: PaginationExpectation = {}) {
        const { hasDocs = true, hasTotal = true, hasPageInfo = true, minimumDocs, maximumDocs } = expectations;

        this.expectSuccessResponse(response, {
            status: 200,
            hasData: true,
            dataType: 'object',
        });

        if (hasDocs) {
            expect(response.body.data).toHaveProperty('docs');
            expect(Array.isArray(response.body.data.docs)).toBe(true);

            if (minimumDocs !== undefined) {
                expect(response.body.data.docs.length).toBeGreaterThanOrEqual(minimumDocs);
            }

            if (maximumDocs !== undefined) {
                expect(response.body.data.docs.length).toBeLessThanOrEqual(maximumDocs);
            }
        }

        if (hasTotal) {
            expect(response.body.data).toHaveProperty('totalDocs');
            expect(typeof response.body.data.totalDocs).toBe('number');
        }

        if (hasPageInfo) {
            expect(response.body.data).toHaveProperty('page');
            expect(response.body.data).toHaveProperty('limit');
            expect(response.body.data).toHaveProperty('totalPages');
            expect(typeof response.body.data.page).toBe('number');
            expect(typeof response.body.data.limit).toBe('number');
            expect(typeof response.body.data.totalPages).toBe('number');
        }
    }

    /**
     * Assert created response (201)
     */
    static expectCreatedResponse(response: Response, requiredFields: string[] = ['_id']) {
        this.expectSuccessResponse(response, {
            status: 201,
            hasData: true,
            dataType: 'object',
            requiredFields,
        });
    }

    /**
     * Assert updated response (200)
     */
    static expectUpdatedResponse(response: Response, requiredFields: string[] = ['_id']) {
        this.expectSuccessResponse(response, {
            status: 200,
            hasData: true,
            dataType: 'object',
            requiredFields,
        });
    }

    /**
     * Assert deleted response (200)
     */
    static expectDeletedResponse(response: Response) {
        this.expectSuccessResponse(response, {
            status: 200,
            hasData: false,
        });
    }

    /**
     * Assert authentication token response
     */
    static expectAuthTokenResponse(response: Response) {
        this.expectSuccessResponse(response, {
            status: 200,
            hasData: true,
            dataType: 'object',
            requiredFields: ['accessToken', 'refreshToken'],
            customAssertions: body => {
                expect(typeof body.data.accessToken).toBe('string');
                expect(typeof body.data.refreshToken).toBe('string');
                expect(body.data.accessToken.length).toBeGreaterThan(0);
                expect(body.data.refreshToken.length).toBeGreaterThan(0);
            },
        });
    }

    /**
     * Assert user response structure
     */
    static expectUserResponse(response: Response, shouldIncludeCredential: boolean = false) {
        const requiredFields = ['_id', 'email', 'username', 'role'];
        if (shouldIncludeCredential) {
            requiredFields.push('userCredential');
        }

        this.expectSuccessResponse(response, {
            status: 200,
            hasData: true,
            dataType: 'object',
            requiredFields,
            customAssertions: body => {
                // User should never expose password/credential in response
                expect(body.data).not.toHaveProperty('password');
                if (!shouldIncludeCredential) {
                    expect(body.data).not.toHaveProperty('userCredential');
                }
            },
        });
    }

    /**
     * Assert restaurant response structure
     */
    static expectRestaurantResponse(response: Response) {
        this.expectSuccessResponse(response, {
            status: 200,
            hasData: true,
            dataType: 'object',
            requiredFields: ['_id', 'restaurantName', 'address', 'cuisine', 'rating'],
        });
    }

    /**
     * Assert business response structure
     */
    static expectBusinessResponse(response: Response) {
        this.expectSuccessResponse(response, {
            status: 200,
            hasData: true,
            dataType: 'object',
            requiredFields: ['_id', 'namePlace', 'address', 'typeBusiness', 'rating'],
        });
    }

    /**
     * Assert review response structure
     */
    static expectReviewResponse(response: Response) {
        this.expectSuccessResponse(response, {
            status: 200,
            hasData: true,
            dataType: 'object',
            requiredFields: ['_id', 'title', 'content', 'rating', 'author'],
        });
    }

    /**
     * Assert rate limiting response
     */
    static expectRateLimitResponse(response: Response) {
        this.expectErrorResponse(response, {
            status: 429,
            hasMessage: true,
            messagePattern: /rate limit|too many requests/i,
        });
    }

    /**
     * Assert server error response
     */
    static expectServerErrorResponse(response: Response) {
        this.expectErrorResponse(response, {
            status: 500,
            hasMessage: true,
            messagePattern: /internal server error|server error/i,
        });
    }
}

/**
 * Convenience wrapper functions for common assertions
 */

export const expectSuccess = (response: Response, expectations?: SuccessResponseExpectation) =>
    ResponseAssertions.expectSuccessResponse(response, expectations);

export const expectError = (response: Response, expectations: ErrorResponseExpectation) =>
    ResponseAssertions.expectErrorResponse(response, expectations);

export const expectValidationError = (response: Response, expectedFields?: string[]) =>
    ResponseAssertions.expectValidationError(response, expectedFields);

export const expectUnauthorized = (response: Response) => ResponseAssertions.expectUnauthorizedResponse(response);

export const expectForbidden = (response: Response) => ResponseAssertions.expectForbiddenResponse(response);

export const expectNotFound = (response: Response, resourceType?: string) =>
    ResponseAssertions.expectNotFoundResponse(response, resourceType);

export const expectPaginated = (response: Response, expectations?: PaginationExpectation) =>
    ResponseAssertions.expectPaginatedResponse(response, expectations);

export const expectCreated = (response: Response, requiredFields?: string[]) =>
    ResponseAssertions.expectCreatedResponse(response, requiredFields);

export const expectUpdated = (response: Response, requiredFields?: string[]) =>
    ResponseAssertions.expectUpdatedResponse(response, requiredFields);

export const expectDeleted = (response: Response) => ResponseAssertions.expectDeletedResponse(response);

export const expectAuthToken = (response: Response) => ResponseAssertions.expectAuthTokenResponse(response);

export const expectUser = (response: Response, shouldIncludeCredential?: boolean) =>
    ResponseAssertions.expectUserResponse(response, shouldIncludeCredential);

export const expectRestaurant = (response: Response) => ResponseAssertions.expectRestaurantResponse(response);

export const expectBusiness = (response: Response) => ResponseAssertions.expectBusinessResponse(response);

export const expectReview = (response: Response) => ResponseAssertions.expectReviewResponse(response);

export const expectRateLimit = (response: Response) => ResponseAssertions.expectRateLimitResponse(response);

export const expectServerError = (response: Response) => ResponseAssertions.expectServerErrorResponse(response);

export default ResponseAssertions;
