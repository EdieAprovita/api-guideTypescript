/**
 * Enhanced test configuration that eliminates security scanner false positives
 * and reduces code duplication across test files
 * Now uses centralized password generator
 */

import { faker } from '@faker-js/faker';
import { generateTestPassword, generateWeakPassword, generateUniquePassword } from '../utils/passwordGenerator';
import { VALIDATION_MESSAGE_TEMPLATES } from '../constants/validationMessages';

// Password generation utilities that avoid any hard-coded patterns
class TestPasswordGenerator {
    private static generateRandomCharacter(charset: string): string {
        return faker.string.fromCharacters(charset, 1);
    }

    static generateSecure(): string {
        // Use centralized generator as base
        const base = generateTestPassword();
        
        // Add random required character types for extra complexity
        const uppercase = TestPasswordGenerator.generateRandomCharacter('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
        const number = TestPasswordGenerator.generateRandomCharacter('0123456789');
        const special = TestPasswordGenerator.generateRandomCharacter('!@#$%^&*()_+-=[]{}|;:,.<>?');

        return base + uppercase + number + special;
    }

    static generateWeak(): string {
        return generateWeakPassword();
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
        invalid: getTestPassword('TEST_INVALID_PASSWORD', TestPasswordGenerator.generateInvalid),
    },

    // User template generators
    users: {
        standard: () => ({
            username: faker.internet.userName(),
            email: faker.internet.email(),
            password: TestPasswordGenerator.generateSecure(),
        }),
        invalid: () => ({
            username: faker.internet.userName(),
            email: faker.internet.email(),
            password: TestPasswordGenerator.generateWeak(),
        }),
    },

    // Password generators for external use
    generators: {
        securePassword: generateTestPassword,
        weakPassword: generateWeakPassword,
        uniquePassword: generateUniquePassword,
    },

    // HTTP status code constants
    statusCodes: {
        ok: 200,
        created: 201,
        badRequest: 400,
        unauthorized: 401,
        forbidden: 403,
        notFound: 404,
        conflict: 409,
        internalServerError: 500,
    },

    // Validation message configuration using updated constants
    validation: {
        messages: {
            authLength: VALIDATION_MESSAGE_TEMPLATES.AUTH_LENGTH_REQUIREMENT,
            emailFormat: VALIDATION_MESSAGE_TEMPLATES.EMAIL_FORMAT_REQUIREMENT,
            authComplexity: VALIDATION_MESSAGE_TEMPLATES.AUTH_COMPLEXITY_REQUIREMENT,
            authUppercase: VALIDATION_MESSAGE_TEMPLATES.AUTH_UPPERCASE_REQUIREMENT,
            authLowercase: VALIDATION_MESSAGE_TEMPLATES.AUTH_LOWERCASE_REQUIREMENT,
            authNumber: VALIDATION_MESSAGE_TEMPLATES.AUTH_NUMBER_REQUIREMENT,
            authSpecial: VALIDATION_MESSAGE_TEMPLATES.AUTH_SPECIAL_REQUIREMENT,
            requiredField: VALIDATION_MESSAGE_TEMPLATES.REQUIRED_FIELD,
        },
    },

    // User creation helpers
    createStandard: () => ({
        username: faker.internet.userName(),
        email: faker.internet.email(),
        password: generateTestPassword(),
        role: 'user',
    }),

    createInvalid: () => ({
        username: faker.internet.userName(),
        email: 'invalid-email',
        password: generateWeakPassword(),
        role: 'user',
    }),
};

export default enhancedTestConfig;