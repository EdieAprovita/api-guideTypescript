/**
 * NoSQL Injection Prevention Utility
 *
 * This module provides sanitization functions to prevent NoSQL injection attacks
 * by removing dangerous MongoDB operators from user input data.
 *
 * @module sanitizer
 */

/**
 * List of dangerous MongoDB operators that should be removed from user input
 * to prevent NoSQL injection attacks.
 *
 * Common attack patterns:
 * - $where: Allows arbitrary JavaScript execution
 * - $ne: Not equal operator can bypass authentication
 * - $gt, $gte, $lt, $lte: Comparison operators can leak information
 * - $regex: Can be used for timing attacks or DoS
 * - $expr: Allows aggregation expressions
 * - $jsonSchema: Can be exploited for schema inference attacks
 */
const MONGODB_OPERATORS = [
    '$where',
    '$ne',
    '$gt',
    '$gte',
    '$lt',
    '$lte',
    '$in',
    '$nin',
    '$regex',
    '$options',
    '$expr',
    '$jsonSchema',
    '$text',
    '$search',
    '$mod',
    '$all',
    '$elemMatch',
    '$size',
    '$type',
    '$exists',
    '$nor',
    '$or',
    '$and',
    '$not',
];

/**
 * Recursively removes MongoDB operators from an object or array.
 *
 * This function traverses nested objects and arrays, removing any keys
 * that match MongoDB operator patterns (starting with '$').
 *
 * @param data - The data to sanitize (object, array, or primitive value)
 * @returns The sanitized data with all MongoDB operators removed
 *
 * @example
 * ```typescript
 * const maliciousInput = {
 *   username: 'admin',
 *   password: { $ne: null } // NoSQL injection attempt
 * };
 *
 * const safe = sanitizeNoSQLInput(maliciousInput);
 * // Result: { username: 'admin' } // $ne removed
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
            console.warn(`⚠️  NoSQL Injection attempt blocked: Removed operator "${key}"`);
            continue;
        }

        // Recursively sanitize nested objects/arrays
        sanitized[key] = sanitizeNoSQLInput(value);
    }

    return sanitized as T;
}

/**
 * Sanitizes query parameters to prevent NoSQL injection attacks.
 *
 * This is specifically designed for query parameters that might be used
 * in MongoDB find operations. It removes dangerous operators while
 * preserving valid query structures.
 *
 * @param query - The query object to sanitize
 * @returns The sanitized query object
 *
 * @example
 * ```typescript
 * const userQuery = {
 *   status: 'active',
 *   createdAt: { $gt: new Date('2024-01-01') } // Potentially malicious
 * };
 *
 * const safe = sanitizeQueryParams(userQuery);
 * // Result: { status: 'active' } // $gt removed
 * ```
 */
export function sanitizeQueryParams<T extends Record<string, any>>(query: T): T {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(query)) {
        // Skip MongoDB operators in keys
        if (key.startsWith('$')) {
            console.warn(`⚠️  NoSQL Injection attempt blocked: Removed query operator "${key}"`);
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
            console.warn(`⚠️  NoSQL Injection attempt blocked: Removed nested operator "${parentKey}.${subKey}"`);
        } else {
            sanitizedValue[subKey] = sanitizeNoSQLInput(subValue);
            hasValidKeys = true;
        }
    }

    // Only return sanitized object if it has valid keys
    return hasValidKeys ? sanitizedValue : sanitizeNoSQLInput(value);
}

/**
 * Validates that a string doesn't contain MongoDB operators.
 * Useful for validating string fields that will be used in queries.
 *
 * @param value - The string value to validate
 * @returns true if the string is safe, false if it contains operators
 *
 * @example
 * ```typescript
 * isStringSafe('normalUsername'); // true
 * isStringSafe('$where'); // false
 * ```
 */
export function isStringSafe(value: string): boolean {
    return !MONGODB_OPERATORS.some(op => value.includes(op));
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
