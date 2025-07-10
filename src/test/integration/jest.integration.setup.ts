// Integration test setup - NO MOCKS for real integration testing
import { faker } from '@faker-js/faker';
import { generateTestPassword } from '../utils/passwordGenerator';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || generateTestPassword();
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || generateTestPassword();
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.BCRYPT_SALT_ROUNDS = '10';

// Disable Redis for tests
process.env.REDIS_HOST = '';
process.env.REDIS_PORT = '';

// Email configuration for tests (mock transporter will be used)
process.env.EMAIL_USER = faker.internet.email();
process.env.EMAIL_PASS = generateTestPassword();
process.env.CLIENT_URL = 'http://localhost:3000';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Clear any global mocks that might interfere with integration tests
jest.clearAllMocks();
jest.restoreAllMocks();

// Explicitly unmock any modules that might be mocked
jest.unmock('../../controllers/userControllers');
jest.unmock('../../services/UserService');
jest.unmock('../../middleware/authMiddleware');
jest.unmock('../../middleware/validation');
jest.unmock('../../middleware/security');
jest.unmock('bcryptjs');
jest.unmock('jsonwebtoken');

// Ensure bcrypt is available for integration tests
const bcrypt = require('bcryptjs');
if (!bcrypt || !bcrypt.hash) {
    console.warn('bcrypt not properly loaded for integration tests');
}
