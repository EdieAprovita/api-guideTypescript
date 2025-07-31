/**
 * Integration Test Setup
 * Configuration for integration tests with real database
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.INTEGRATION_TEST = 'true'; // Flag to avoid importing mocks
process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests-very-long-and-secure-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-integration-tests-very-long-and-secure-key';
process.env.BCRYPT_SALT_ROUNDS = '4';

// Disable rate limiting for tests
process.env.DISABLE_RATE_LIMIT = 'true';

// CRITICAL: Clear all mocks for integration tests to use real implementations
vi.clearAllMocks();
vi.resetAllMocks();

// Unmock all modules for integration tests to use real implementations
vi.unmock('../../app');
vi.unmock('../../services/UserService');
vi.unmock('../../services/TokenService');
vi.unmock('../../controllers/userControllers');
vi.unmock('../../middleware/authMiddleware');
vi.unmock('../../middleware/validation');
vi.unmock('../../middleware/security');
vi.unmock('../../utils/validators');
vi.unmock('../../models/User');
vi.unmock('bcryptjs');
vi.unmock('jsonwebtoken');

// Force reset modules to ensure real implementations
vi.resetModules();

// Database setup for integration tests
beforeAll(async () => {
    try {
        // Start MongoDB Memory Server
        mongoServer = await MongoMemoryServer.create({
            binary: {
                version: '6.0.0',
            },
        });

        const mongoUri = mongoServer.getUri();
        process.env.MONGODB_URI = mongoUri;

        // Connect to the test database
        await mongoose.connect(mongoUri, {
            maxPoolSize: 1,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 5000,
        });

        console.log('✅ Test database connected');
    } catch (error) {
        console.error('❌ Failed to setup test database:', error);
        process.exit(1);
    }
}, 60000);

afterAll(async () => {
    try {
        // Disconnect from database
        await mongoose.disconnect();

        // Stop MongoDB Memory Server
        if (mongoServer) {
            await mongoServer.stop();
        }

        console.log('✅ Test database disconnected');
    } catch (error) {
        console.error('❌ Failed to cleanup test database:', error);
    }
}, 30000);

beforeEach(async () => {
    // Clear all collections before each test
    const collections = mongoose.connection.collections;

    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }

    // Clear any mock Redis storage if it exists
    try {
        const { default: TokenService } = await import('../../services/TokenService');
        if (typeof TokenService.clearAllForTesting === 'function') {
            await TokenService.clearAllForTesting();
        }
    } catch (error) {
        // Ignore errors if TokenService is not available
    }
});

afterEach(async () => {
    // Additional cleanup if needed
    // This runs after each test
});
