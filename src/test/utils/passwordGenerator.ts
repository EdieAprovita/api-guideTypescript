/**
 * Centralized Password Generator for Test Suite
 * 
 * This module provides a unified password generation system for all tests,
 * eliminating duplication and ensuring consistent security practices across
 * the entire test suite.
 * 
 * Security Features:
 * - No hardcoded passwords anywhere in the codebase
 * - Environment-aware password generation
 * - Security scanner-friendly implementation
 * - Multiple password strength levels for different test scenarios
 * - Deterministic password generation for reproducible tests
 */

import { faker } from '@faker-js/faker';

/**
 * Password configuration interface for type safety
 */
interface PasswordConfig {
    length: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    specialChars: string;
    environmentVariable?: string;
}

/**
 * Predefined password configurations for different test scenarios
 */
const PASSWORD_CONFIGS = {
    // Strong password for general authentication testing
    STRONG: {
        length: 12,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
        environmentVariable: 'TEST_USER_PASSWORD',
    } as PasswordConfig,

    // Medium strength for intermediate testing
    MEDIUM: {
        length: 10,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
        specialChars: '',
    } as PasswordConfig,

    // Weak password for validation testing
    WEAK: {
        length: 3,
        requireUppercase: false,
        requireNumbers: false,
        requireSpecialChars: false,
        specialChars: '',
    } as PasswordConfig,

    // Very strong for admin/security tests
    VERY_STRONG: {
        length: 16,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?~`',
    } as PasswordConfig,

    // API key style for token testing
    API_KEY: {
        length: 32,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
        specialChars: '',
    } as PasswordConfig,
} as const;

/**
 * Password strength levels for easy access
 */
export type PasswordStrength = keyof typeof PASSWORD_CONFIGS;

/**
 * Core password generator class
 */
class TestPasswordGenerator {
    private static instance: TestPasswordGenerator;
    private cache: Map<string, string> = new Map();

    /**
     * Singleton pattern to ensure consistent password generation
     */
    public static getInstance(): TestPasswordGenerator {
        if (!TestPasswordGenerator.instance) {
            TestPasswordGenerator.instance = new TestPasswordGenerator();
        }
        return TestPasswordGenerator.instance;
    }

    /**
     * Generate a random character from a given set
     */
    private generateRandomCharacter(chars: string): string {
        return chars.charAt(Math.floor(Math.random() * chars.length));
    }

    /**
     * Ensure password meets all requirements by adding required character types
     */
    private ensureRequirements(password: string, config: PasswordConfig): string {
        let result = password;
        
        if (config.requireUppercase && !/[A-Z]/.test(result)) {
            const pos = Math.floor(Math.random() * result.length);
            result = result.substring(0, pos) + 
                    this.generateRandomCharacter('ABCDEFGHIJKLMNOPQRSTUVWXYZ') + 
                    result.substring(pos + 1);
        }

        if (config.requireNumbers && !/[0-9]/.test(result)) {
            const pos = Math.floor(Math.random() * result.length);
            result = result.substring(0, pos) + 
                    this.generateRandomCharacter('0123456789') + 
                    result.substring(pos + 1);
        }

        if (config.requireSpecialChars && config.specialChars && 
            !new RegExp(`[${config.specialChars.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')}]`).test(result)) {
            const pos = Math.floor(Math.random() * result.length);
            result = result.substring(0, pos) + 
                    this.generateRandomCharacter(config.specialChars) + 
                    result.substring(pos + 1);
        }

        return result;
    }

    /**
     * Generate password based on configuration
     */
    private generatePassword(config: PasswordConfig): string {
        // Check environment variable first if specified
        if (config.environmentVariable && process.env[config.environmentVariable]) {
            return process.env[config.environmentVariable];
        }

        // Build character set
        let chars = 'abcdefghijklmnopqrstuvwxyz';
        if (config.requireUppercase) {
            chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        }
        if (config.requireNumbers) {
            chars += '0123456789';
        }
        if (config.requireSpecialChars && config.specialChars) {
            chars += config.specialChars;
        }

        // Generate base password
        let password = '';
        for (let i = 0; i < config.length; i++) {
            password += this.generateRandomCharacter(chars);
        }

        // Ensure all requirements are met
        return this.ensureRequirements(password, config);
    }

    /**
     * Generate password with caching for consistent results in same test run
     */
    public generate(strength: PasswordStrength, useCache: boolean = true): string {
        const cacheKey = `${strength}_${useCache}`;
        
        if (useCache && this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        const config = PASSWORD_CONFIGS[strength];
        const password = this.generatePassword(config);

        if (useCache) {
            this.cache.set(cacheKey, password);
        }

        return password;
    }

    /**
     * Generate deterministic password for reproducible tests
     */
    public generateDeterministic(strength: PasswordStrength, seed: string): string {
        // Use seed to create deterministic faker instance
        faker.seed(this.hashSeed(seed));
        
        const config = PASSWORD_CONFIGS[strength];
        let chars = 'abcdefghijklmnopqrstuvwxyz';
        
        if (config.requireUppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (config.requireNumbers) chars += '0123456789';
        if (config.requireSpecialChars && config.specialChars) chars += config.specialChars;

        const password = faker.internet.password({
            length: config.length,
            pattern: new RegExp(`[${chars.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')}]`),
        });

        // Reset faker to random state
        faker.seed();

        return this.ensureRequirements(password, config);
    }

    /**
     * Simple hash function for seed
     */
    private hashSeed(seed: string): number {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            const char = seed.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Clear password cache (useful for test isolation)
     */
    public clearCache(): void {
        this.cache.clear();
    }

    /**
     * Validate password meets specific requirements
     */
    public validate(password: string, strength: PasswordStrength): boolean {
        const config = PASSWORD_CONFIGS[strength];
        
        if (password.length < config.length) return false;
        if (config.requireUppercase && !/[A-Z]/.test(password)) return false;
        if (config.requireNumbers && !/[0-9]/.test(password)) return false;
        if (config.requireSpecialChars && config.specialChars) {
            const regex = new RegExp(`[${config.specialChars.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')}]`);
            if (!regex.test(password)) return false;
        }

        return true;
    }
}

/**
 * Singleton instance
 */
const passwordGenerator = TestPasswordGenerator.getInstance();

/**
 * Convenient generator functions for different use cases
 */

/**
 * Generate a strong password for general authentication testing
 * This is the most commonly used password generator
 */
export const generateTestPassword = (): string => {
    return passwordGenerator.generate('STRONG');
};

/**
 * Generate a weak password for validation testing
 * Used to test password strength validation
 */
export const generateWeakPassword = (): string => {
    return passwordGenerator.generate('WEAK');
};

/**
 * Generate a very strong password for admin/security tests
 */
export const generateStrongPassword = (): string => {
    return passwordGenerator.generate('VERY_STRONG');
};

/**
 * Generate a medium strength password
 */
export const generateMediumPassword = (): string => {
    return passwordGenerator.generate('MEDIUM');
};

/**
 * Generate an API key style password
 */
export const generateApiKey = (): string => {
    return passwordGenerator.generate('API_KEY');
};

/**
 * Generate password without caching (for unique passwords)
 */
export const generateUniquePassword = (strength: PasswordStrength = 'STRONG'): string => {
    return passwordGenerator.generate(strength, false);
};

/**
 * Generate deterministic password for reproducible tests
 */
export const generateDeterministicPassword = (
    seed: string, 
    strength: PasswordStrength = 'STRONG'
): string => {
    return passwordGenerator.generateDeterministic(strength, seed);
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string, strength: PasswordStrength = 'STRONG'): boolean => {
    return passwordGenerator.validate(password, strength);
};

/**
 * Clear password cache (call this in test cleanup)
 */
export const clearPasswordCache = (): void => {
    passwordGenerator.clearCache();
};

/**
 * Environment-aware password getter
 * Checks environment variables first, then generates
 */
export const getTestPassword = (envVar?: string): string => {
    if (envVar && process.env[envVar]) {
        return process.env[envVar];
    }
    return generateTestPassword();
};

/**
 * Batch password generation for multiple test scenarios
 */
export const generatePasswordSet = () => {
    return {
        strong: generateTestPassword(),
        weak: generateWeakPassword(),
        medium: generateMediumPassword(),
        veryStrong: generateStrongPassword(),
        apiKey: generateApiKey(),
        unique1: generateUniquePassword(),
        unique2: generateUniquePassword(),
    };
};

/**
 * Password generation for specific user roles
 */
export const generateRoleBasedPassword = (role: 'user' | 'admin' | 'professional'): string => {
    switch (role) {
        case 'admin':
            return generateStrongPassword();
        case 'professional':
            return generateTestPassword();
        case 'user':
        default:
            return generateMediumPassword();
    }
};

/**
 * Export password configurations for advanced use cases
 */
export { PASSWORD_CONFIGS, PasswordStrength };

/**
 * Export the generator instance for advanced usage
 */
export { passwordGenerator };

/**
 * Backward compatibility exports
 * These maintain compatibility with existing code
 */
export default {
    generateTestPassword,
    generateWeakPassword,
    generateStrongPassword,
    generateMediumPassword,
    generateApiKey,
    generateUniquePassword,
    generateDeterministicPassword,
    validatePassword,
    clearPasswordCache,
    getTestPassword,
    generatePasswordSet,
    generateRoleBasedPassword,
    PASSWORD_CONFIGS,
};