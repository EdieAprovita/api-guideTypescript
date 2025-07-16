/**
 * Centralized response expectation utilities
 * This file consolidates all response expectation patterns to eliminate duplication
 */

import request from 'supertest';

// Base response expectations
export const expectErrorResponse = (
    response: request.Response,
    expectedStatus: number,
    expectedMessage: string,
    expectedError?: string
) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(expectedMessage);
    if (expectedError) {
        expect(response.body.error).toBe(expectedError);
    }
};

export const expectSuccessResponse = (
    response: request.Response,
    expectedStatus: number = 200,
    expectedMessage?: string,
    expectedData?: unknown
) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body.success).toBe(true);
    if (expectedMessage) {
        expect(response.body.message).toBe(expectedMessage);
    }
    if (expectedData) {
        expect(response.body.data).toEqual(expectedData);
    }
};

export const expectValidationErrorResponse = (
    response: request.Response,
    expectedMessage: string,
    expectedError: string,
    expectedErrors: Array<{ field: string; message: string }>
) => {
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
        success: false,
        message: expectedMessage,
        error: expectedError,
        errors: expectedErrors,
    });
};

// Specific HTTP status expectations
export const expectResourceCreated = (
    response: request.Response,
    expectedMessage: string = 'Resource created successfully',
    expectedData?: unknown
) => {
    expectSuccessResponse(response, 201, expectedMessage, expectedData);
};

export const expectResourceUpdated = (
    response: request.Response,
    expectedMessage: string = 'Resource updated successfully',
    expectedData?: unknown
) => {
    expectSuccessResponse(response, 200, expectedMessage, expectedData);
};

export const expectResourceDeleted = (
    response: request.Response,
    expectedMessage: string = 'Resource deleted successfully'
) => {
    expectSuccessResponse(response, 200, expectedMessage);
};

export const expectResourceNotFound = (response: request.Response, expectedMessage: string = 'Resource not found') => {
    expectErrorResponse(response, 404, expectedMessage);
};

export const expectUnauthorized = (response: request.Response, expectedMessage: string = 'Unauthorized access') => {
    expectErrorResponse(response, 401, expectedMessage);
};

export const expectValidationError = (response: request.Response, expectedMessage: string = 'Validation failed') => {
    expectErrorResponse(response, 400, expectedMessage);
};

export const expectServerError = (response: request.Response, expectedMessage: string = 'Internal server error') => {
    expectErrorResponse(response, 500, expectedMessage);
};

// Security headers expectations
export const expectSecurityHeaders = (response: request.Response) => {
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['x-powered-by']).toBeUndefined();
};

export default {
    expectErrorResponse,
    expectSuccessResponse,
    expectValidationErrorResponse,
    expectResourceCreated,
    expectResourceUpdated,
    expectResourceDeleted,
    expectResourceNotFound,
    expectUnauthorized,
    expectValidationError,
    expectServerError,
    expectSecurityHeaders,
};
