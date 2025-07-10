/**
 * Enhanced test configuration that eliminates security scanner false positives
 * and reduces code duplication across test files
 */

import { faker } from '@faker-js/faker';
import { VALIDATION_MESSAGE_TEMPLATES } from '../constants/validationMessages';

// Password generation utilities that avoid any hard-coded patterns
class TestPasswordGenerator {
    private static generateRandomCharacter(charset: string): string {
        return faker.string.fromCharacters(charset, 1);
    }

    static generateSecure(): string {
        const base = faker.internet.password({
            length: 12,
            memorable: false,
            pattern: /[A-Za-z0-9]/,
        });

        // Add random required character types
        const uppercase = TestPasswordGenerator.generateRandomCharacter('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
        const number = TestPasswordGenerator.generateRandomCharacter('0123456789');
        const special = TestPasswordGenerator.generateRandomCharacter('!@#$%^&*()_+-=[]{}|;:,.<>?');

        return base + uppercase + number + special;
    }

    static generateWeak(): string {
        return faker.string.alphanumeric(3);
    }

    static generateInvalid(): string {
        return faker.string.alpha(7); // Too short and missing required chars
    }
}

// Environment-aware password configuration
const getTestPassword = (envVar: string, generator: () => string): string => {
    const envValue = process.env[envVar];
    return envValue || generator();
};

// Main test configuration object
export const enhancedTestConfig = {
    // All passwords are either from environment or dynamically generated
    credentials: {
        valid: getTestPassword('TEST_VALID_PASSWORD', TestPasswordGenerator.generateSecure),
        weak: getTestPassword('TEST_WEAK_PASSWORD', TestPasswordGenerator.generateWeak),
        wrong: getTestPassword('TEST_WRONG_PASSWORD', TestPasswordGenerator.generateSecure),
        fixture: getTestPassword('TEST_FIXTURE_PASSWORD', TestPasswordGenerator.generateSecure),
    },

    // Dynamic generators for runtime use
    generators: {
        securePassword: TestPasswordGenerator.generateSecure,
        weakPassword: TestPasswordGenerator.generateWeak,
        invalidPassword: TestPasswordGenerator.generateInvalid,
        phoneNumber: () => faker.phone.number(),
        email: () => faker.internet.email(),
        username: () => faker.internet.userName(),
        mongoId: () => faker.database.mongodbObjectId(),
    },

    // User templates
    userTemplates: {
        createStandard: (role: 'user' | 'admin' = 'user') => ({
            username: faker.internet.userName(),
            email: faker.internet.email(),
            password: TestPasswordGenerator.generateSecure(),
            role,
        }),
        createInvalid: () => ({
            username: '',
            email: 'invalid-email',
            password: TestPasswordGenerator.generateWeak(),
            role: 'user',
        }),
    },

    // Test data constants (not sensitive information)
    testData: {
        defaultTimeout: 30000,
        apiTimeout: 5000,
        retryAttempts: 3,
        pageSize: 10,
    },

    // Message templates using constants (clearly not credentials)
    messages: {
        validation: {
            passwordLength: VALIDATION_MESSAGE_TEMPLATES.PASSWORD_LENGTH_REQUIREMENT,
            emailFormat: VALIDATION_MESSAGE_TEMPLATES.EMAIL_FORMAT_REQUIREMENT,
            passwordComplexity: VALIDATION_MESSAGE_TEMPLATES.PASSWORD_COMPLEXITY_REQUIREMENT,
            passwordUppercase: VALIDATION_MESSAGE_TEMPLATES.PASSWORD_UPPERCASE_REQUIREMENT,
            passwordLowercase: VALIDATION_MESSAGE_TEMPLATES.PASSWORD_LOWERCASE_REQUIREMENT,
            passwordNumber: VALIDATION_MESSAGE_TEMPLATES.PASSWORD_NUMBER_REQUIREMENT,
            passwordSpecial: VALIDATION_MESSAGE_TEMPLATES.PASSWORD_SPECIAL_REQUIREMENT,
        },
    },

    // HTTP status codes
    httpStatus: {
        OK: 200,
        CREATED: 201,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        INTERNAL_SERVER_ERROR: 500,
    } as const,
} as const;

// Export backward compatibility
export const testConfig = {
    passwords: {
        validPassword: enhancedTestConfig.credentials.valid,
        weakPassword: enhancedTestConfig.credentials.weak,
        wrongPassword: enhancedTestConfig.credentials.wrong,
        fixturePassword: enhancedTestConfig.credentials.fixture,
    },
    generateTestPassword: enhancedTestConfig.generators.securePassword,
    generateTestPhone: enhancedTestConfig.generators.phoneNumber,
    testUsers: {
        validUser: {
            username: faker.internet.userName(),
            email: faker.internet.email(),
            role: 'user' as const,
        },
        adminUser: {
            username: faker.internet.userName(),
            email: faker.internet.email(),
            role: 'admin' as const,
        },
    },
    validationErrors: {
        shortPassword: enhancedTestConfig.messages.validation.passwordLength,
        invalidEmail: enhancedTestConfig.messages.validation.emailFormat,
        weakPassword: enhancedTestConfig.messages.validation.passwordComplexity,
    },
} as const;
