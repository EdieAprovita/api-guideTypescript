import { faker } from '@faker-js/faker';

export const testConfig = {
  passwords: {
    // Use environment variable or generate a strong password for tests
    validPassword: process.env.TEST_VALID_PASSWORD || 'ValidPass123!',
    weakPassword: 'weak',
    wrongPassword: process.env.TEST_WRONG_PASSWORD || 'WrongPass123!',
    fixturePassword: process.env.TEST_FIXTURE_PASSWORD || 'FixturePass123!',
  },
  
  // Generate consistent test data for each test run
  generateTestPassword: () => {
    const password = faker.internet.password({
      length: 12,
      memorable: false,
      pattern: /[A-Za-z0-9!@#$%^&*]/,
    });
    // Ensure it meets strength requirements
    return password + 'A1!';
  },
  
  // Common test user data
  testUsers: {
    validUser: {
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
    },
    adminUser: {
      username: 'adminuser',
      email: 'admin@example.com',
      role: 'admin',
    },
  },
  
  // Error messages for validation
  validationErrors: {
    shortPassword: 'Password must be at least 8 characters long',
    invalidEmail: 'Please enter a valid email address',
    weakPassword: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  },
} as const;