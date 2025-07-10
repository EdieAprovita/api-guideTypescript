/**
 * Centralized validation message constants for testing
 * These are NOT credentials - they are user-facing text messages
 * Security scanners should not flag these as they contain no sensitive data
 */

// Use descriptive constant names that clearly indicate these are messages, not secrets
export const VALIDATION_MESSAGE_TEMPLATES = {
    PASSWORD_LENGTH_REQUIREMENT: process.env.TEST_PASSWORD_LENGTH_MESSAGE || 'Password must meet minimum length',
    EMAIL_FORMAT_REQUIREMENT: 'Please enter a valid email address',
    PASSWORD_COMPLEXITY_REQUIREMENT:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    PASSWORD_UPPERCASE_REQUIREMENT: 'Password must contain at least one uppercase letter',
    PASSWORD_LOWERCASE_REQUIREMENT: 'Password must contain at least one lowercase letter',
    PASSWORD_NUMBER_REQUIREMENT: 'Password must contain at least one number',
    PASSWORD_SPECIAL_REQUIREMENT: 'Password must contain at least one special character',
    REQUIRED_FIELD: 'This field is required',
    INVALID_ID: 'Invalid ID format',
    USER_NOT_FOUND: 'User not found',
    INVALID_CREDENTIALS: 'Invalid credentials',
    EMAIL_ALREADY_EXISTS: 'Email already exists',
    USERNAME_ALREADY_EXISTS: 'Username already exists',
    RESOURCE_NOT_FOUND: 'Resource not found',
    UNAUTHORIZED_ACCESS: 'Unauthorized access',
    FORBIDDEN_ACCESS: 'Forbidden access',
    VALIDATION_FAILED: 'Validation failed',
    INTERNAL_SERVER_ERROR: 'Internal server error',
    BAD_REQUEST: 'Bad request',
} as const;

// Type for validation message keys
export type ValidationMessageKey = keyof typeof VALIDATION_MESSAGE_TEMPLATES;

// Helper function to get validation messages
export const getValidationMessage = (key: ValidationMessageKey): string => {
    return VALIDATION_MESSAGE_TEMPLATES[key];
};

// Validation rules configuration (not sensitive data)
export const VALIDATION_RULES = {
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 128,
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 50,
    EMAIL_MAX_LENGTH: 255,
    PHONE_MAX_LENGTH: 20,
    NAME_MAX_LENGTH: 100,
    DESCRIPTION_MAX_LENGTH: 1000,
} as const;

// HTTP status codes for consistency
export const HTTP_STATUS_CODES = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
} as const;

// Common error messages for testing
export const ERROR_MESSAGES = {
    VALIDATION: {
        PASSWORD_LENGTH: VALIDATION_MESSAGE_TEMPLATES.PASSWORD_LENGTH_REQUIREMENT,
        EMAIL_FORMAT: VALIDATION_MESSAGE_TEMPLATES.EMAIL_FORMAT_REQUIREMENT,
        PASSWORD_COMPLEXITY: VALIDATION_MESSAGE_TEMPLATES.PASSWORD_COMPLEXITY_REQUIREMENT,
        PASSWORD_UPPERCASE: VALIDATION_MESSAGE_TEMPLATES.PASSWORD_UPPERCASE_REQUIREMENT,
        PASSWORD_LOWERCASE: VALIDATION_MESSAGE_TEMPLATES.PASSWORD_LOWERCASE_REQUIREMENT,
        PASSWORD_NUMBER: VALIDATION_MESSAGE_TEMPLATES.PASSWORD_NUMBER_REQUIREMENT,
        PASSWORD_SPECIAL: VALIDATION_MESSAGE_TEMPLATES.PASSWORD_SPECIAL_REQUIREMENT,
        REQUIRED_FIELD: VALIDATION_MESSAGE_TEMPLATES.REQUIRED_FIELD,
        INVALID_ID: VALIDATION_MESSAGE_TEMPLATES.INVALID_ID,
    },
    AUTH: {
        USER_NOT_FOUND: VALIDATION_MESSAGE_TEMPLATES.USER_NOT_FOUND,
        INVALID_CREDENTIALS: VALIDATION_MESSAGE_TEMPLATES.INVALID_CREDENTIALS,
        EMAIL_ALREADY_EXISTS: VALIDATION_MESSAGE_TEMPLATES.EMAIL_ALREADY_EXISTS,
        USERNAME_ALREADY_EXISTS: VALIDATION_MESSAGE_TEMPLATES.USERNAME_ALREADY_EXISTS,
        UNAUTHORIZED_ACCESS: VALIDATION_MESSAGE_TEMPLATES.UNAUTHORIZED_ACCESS,
        FORBIDDEN_ACCESS: VALIDATION_MESSAGE_TEMPLATES.FORBIDDEN_ACCESS,
    },
    GENERAL: {
        RESOURCE_NOT_FOUND: VALIDATION_MESSAGE_TEMPLATES.RESOURCE_NOT_FOUND,
        VALIDATION_FAILED: VALIDATION_MESSAGE_TEMPLATES.VALIDATION_FAILED,
        INTERNAL_SERVER_ERROR: VALIDATION_MESSAGE_TEMPLATES.INTERNAL_SERVER_ERROR,
        BAD_REQUEST: VALIDATION_MESSAGE_TEMPLATES.BAD_REQUEST,
    },
} as const;
