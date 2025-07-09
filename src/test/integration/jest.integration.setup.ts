// Integration test setup - NO MOCKS for real integration testing
import { faker } from '@faker-js/faker';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || faker.string.alphanumeric(64);
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || faker.string.alphanumeric(64);
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.BCRYPT_SALT_ROUNDS = '10';

// Disable Redis for tests
process.env.REDIS_HOST = '';
process.env.REDIS_PORT = '';

// Email configuration for tests (mock transporter will be used)
process.env.EMAIL_USER = faker.internet.email();
process.env.EMAIL_PASS = faker.internet.password();
process.env.CLIENT_URL = 'http://localhost:3000';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Clear any existing mocks to ensure integration tests use real implementations
jest.clearAllMocks();
jest.resetAllMocks();
jest.restoreAllMocks();

// Explicitly unmock any modules that might be mocked
jest.unmock('../../controllers/userControllers');
jest.unmock('../../services/UserService');
jest.unmock('../../middleware/authMiddleware');
jest.unmock('../../middleware/validation');
jest.unmock('../../middleware/security');
