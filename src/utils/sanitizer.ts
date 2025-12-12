/**
 * NoSQL Injection Prevention Utility
 *
 * This module provides sanitization functions to prevent NoSQL injection attacks
 * by removing dangerous MongoDB operators from user input data.
 *
 * ⚠️ IMPORTANT: These functions should ONLY be used to sanitize untrusted user input
 * at the application boundary (controllers/route handlers), NOT for application-constructed
 * queries or data structures within the service layer.
 *
 * @module sanitizer
 */

import { logWarn } from './logger';

/**
 * Recursively removes MongoDB operators from untrusted user input.
 *
 * This function traverses nested objects and arrays, removing any keys
 * that match MongoDB operator patterns (starting with '$').
 *
 * ⚠️ USAGE: Apply this ONLY to untrusted user input (req.body, req.query, req.params)
 * at the controller/route handler level BEFORE passing data to services.
 * DO NOT use this on application-constructed queries or data.
 *
 * @param data - The user input data to sanitize (object, array, or primitive value)
 * @returns The sanitized data with all MongoDB operators removed
 *
 * @example
 * ```typescript
 * // In a controller:
 * const userInput = req.body; // { username: 'admin', password: { $ne: null } }
 * const safeInput = sanitizeNoSQLInput(userInput);
 * // Result: { username: 'admin' } // $ne removed
 *
 * // Then pass safe input to service:
 * await userService.create(safeInput);
 * ```
 */
export function sanitizeNoSQLInput<T>(data: T): T {
    if (data === null || data === undefined) {
        return data;
    }

    // Handle primitive types
    if (typeof data !== 'object') {
        return data;
    }

    // Handle arrays recursively
    if (Array.isArray(data)) {
        return data.map(item => sanitizeNoSQLInput(item)) as unknown as T;
    }

    // Handle objects
    const sanitized: any = {};

    for (const [key, value] of Object.entries(data)) {
        // Skip keys that are MongoDB operators
        if (key.startsWith('$')) {
            logWarn('NoSQL injection attempt blocked', {
                operator: key,
                action: 'removed_operator',
                securityEvent: 'nosql_injection_attempt',
            });
            continue;
        }

        // Recursively sanitize nested objects/arrays
        sanitized[key] = sanitizeNoSQLInput(value);
    }

    return sanitized as T;
}

/**
 * Sanitizes query parameters from untrusted user input to prevent NoSQL injection attacks.
 *
 * This is specifically designed for query parameters that come from user input
 * (e.g., req.query). It removes dangerous operators while preserving valid field names.
 *
 * ⚠️ USAGE: Apply this ONLY to untrusted user input at the controller level
 * BEFORE using it to construct queries. DO NOT use this on application-constructed queries.
 *
 * @param query - The user-provided query object to sanitize
 * @returns The sanitized query object
 *
 * @example
 * ```typescript
 * // In a controller:
 * const userQuery = req.query; // { status: 'active', createdAt: { $gt: '2024-01-01' } }
 * const safeQuery = sanitizeQueryParams(userQuery);
 * // Result: { status: 'active' } // $gt removed from user input
 *
 * // Application can then safely add its own operators:
 * const fullQuery = {
 *   ...safeQuery,
 *   createdAt: { $gte: new Date('2024-01-01') } // Application-controlled operator
 * };
 * ```
 */
export function sanitizeQueryParams<T extends Record<string, any>>(query: T): T {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(query)) {
        // Skip MongoDB operators in keys
        if (key.startsWith('$')) {
            logWarn('NoSQL injection attempt blocked in query params', {
                operator: key,
                action: 'removed_query_operator',
                securityEvent: 'nosql_injection_attempt',
            });
            continue;
        }

        // If value is an object, sanitize nested operators
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            sanitized[key] = sanitizeNestedObject(value, key);
        } else {
            sanitized[key] = sanitizeNoSQLInput(value);
        }
    }

    return sanitized as T;
}

/**
 * Helper function to sanitize nested objects within query parameters
 */
function sanitizeNestedObject(value: any, parentKey: string): any {
    const sanitizedValue: any = {};
    let hasValidKeys = false;

    for (const [subKey, subValue] of Object.entries(value)) {
        if (subKey.startsWith('$')) {
            logWarn('NoSQL injection attempt blocked in nested object', {
                parentKey,
                operator: subKey,
                fullPath: `${parentKey}.${subKey}`,
                action: 'removed_nested_operator',
                securityEvent: 'nosql_injection_attempt',
            });
        } else {
            sanitizedValue[subKey] = sanitizeNoSQLInput(subValue);
            hasValidKeys = true;
        }
    }

    // Only return sanitized object if it has valid keys
    return hasValidKeys ? sanitizedValue : sanitizeNoSQLInput(value);
}

/**
 * Type guard to check if a value is a plain object (not an array, Date, etc.)
 *
 * @param value - The value to check
 * @returns true if value is a plain object
 */
export function isPlainObject(value: any): value is Record<string, any> {
    return value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}
