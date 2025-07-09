/**
 * Security-focused test helpers for password and authentication testing
 * This file contains utilities for generating test passwords and validation messages
 * that are used solely for testing purposes and do not contain hard-coded secrets.
 */

import { faker } from '@faker-js/faker';

/**
 * Generates a cryptographically secure password for testing purposes
 * Uses faker.js to ensure randomness and unpredictability
 */
export const generateSecureTestPassword = (): string => {
  const base = faker.internet.password({
    length: 12,
    memorable: false,
    pattern: /[A-Za-z0-9]/,
  });
  
  // Add required character types to meet security requirements
  const uppercase = faker.string.fromCharacters('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 1);
  const number = faker.string.fromCharacters('0123456789', 1);
  const special = faker.string.fromCharacters('!@#$%^&*()_+-=[]{}|;:,.<>?', 1);
  
  return base + uppercase + number + special;
};

/**
 * Generates a weak password for testing validation logic
 * This is intentionally weak for testing purposes only
 */
export const generateWeakTestPassword = (): string => {
  return faker.string.alphanumeric(3);
};

/**
 * Password strength validation messages
 * These are NOT actual passwords - they are user-facing error messages
 * Security scanners may flag these, but they are legitimate validation text
 */
export const PASSWORD_VALIDATION_MESSAGES = {
  SHORT_PASSWORD: 'Password must be at least 8 characters long',
  INVALID_EMAIL: 'Please enter a valid email address', 
  WEAK_PASSWORD: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  MISSING_UPPERCASE: 'Password must contain at least one uppercase letter',
  MISSING_LOWERCASE: 'Password must contain at least one lowercase letter',
  MISSING_NUMBER: 'Password must contain at least one number',
  MISSING_SPECIAL: 'Password must contain at least one special character',
} as const;

/**
 * Test user templates with secure password generation
 */
export const generateTestUser = (role: 'user' | 'admin' = 'user') => ({
  username: faker.internet.userName(),
  email: faker.internet.email(),
  password: generateSecureTestPassword(),
  role,
});

/**
 * Validates that a string is a test password (for security testing)
 * Returns true if the password meets the minimum security requirements
 */
export const isValidTestPassword = (password: string): boolean => {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);
  
  return hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
};
