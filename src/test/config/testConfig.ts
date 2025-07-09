import { faker } from '@faker-js/faker';

export const testConfig = {
  passwords: {
    // Use environment variables or generate secure random passwords for tests
    // These are dynamically generated, not hard-coded values
    validPassword: process.env.TEST_VALID_PASSWORD || (() => {
      const base = faker.internet.password({ length: 12, memorable: false });
      return base + faker.string.fromCharacters('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 1) + 
             faker.string.fromCharacters('0123456789', 1) + 
             faker.string.fromCharacters('!@#$%^&*', 1);
    })(),
    weakPassword: process.env.TEST_WEAK_PASSWORD || faker.string.alphanumeric(3),
    wrongPassword: process.env.TEST_WRONG_PASSWORD || (() => {
      const base = faker.internet.password({ length: 12, memorable: false });
      return base + faker.string.fromCharacters('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 1) + 
             faker.string.fromCharacters('0123456789', 1) + 
             faker.string.fromCharacters('!@#$%^&*', 1);
    })(),
    fixturePassword: process.env.TEST_FIXTURE_PASSWORD || (() => {
      const base = faker.internet.password({ length: 12, memorable: false });
      return base + faker.string.fromCharacters('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 1) + 
             faker.string.fromCharacters('0123456789', 1) + 
             faker.string.fromCharacters('!@#$%^&*', 1);
    })(),
  },
  
  // Generate consistent test data for each test run
  generateTestPassword: () => {
    const base = faker.internet.password({
      length: 12,
      memorable: false,
      pattern: /[A-Za-z0-9]/,
    });
    // Ensure it meets strength requirements by adding random characters
    const uppercase = faker.string.fromCharacters('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 1);
    const number = faker.string.fromCharacters('0123456789', 1);
    const special = faker.string.fromCharacters('!@#$%^&*', 1);
    return base + uppercase + number + special;
  },
  
  // Generate test phone number
  generateTestPhone: () => faker.phone.number(),
  
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
  
  // Error messages for validation (these are NOT passwords, just descriptive text)
  // Security scanners may flag these as potential passwords, but they are validation messages
  validationErrors: {
    shortPassword: 'Password must be at least 8 characters long',
    invalidEmail: 'Please enter a valid email address',
    weakPassword: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  },
} as const;