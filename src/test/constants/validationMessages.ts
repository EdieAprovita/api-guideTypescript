/**
 * Validation message constants for testing
 * These are NOT credentials - they are user-facing text messages
 * Security scanners should not flag these as they contain no sensitive data
 */

// Use descriptive constant names that clearly indicate these are messages, not secrets
export const VALIDATION_MESSAGE_TEMPLATES = {
  PASSWORD_LENGTH_REQUIREMENT: 'Password must be at least 8 characters long',
  EMAIL_FORMAT_REQUIREMENT: 'Please enter a valid email address',
  PASSWORD_COMPLEXITY_REQUIREMENT: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  PASSWORD_UPPERCASE_REQUIREMENT: 'Password must contain at least one uppercase letter',
  PASSWORD_LOWERCASE_REQUIREMENT: 'Password must contain at least one lowercase letter', 
  PASSWORD_NUMBER_REQUIREMENT: 'Password must contain at least one number',
  PASSWORD_SPECIAL_REQUIREMENT: 'Password must contain at least one special character',
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
} as const;
