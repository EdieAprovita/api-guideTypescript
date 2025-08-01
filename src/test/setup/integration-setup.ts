/**
 * Integration Test Setup
 * Configuration for integration tests with real database
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

let mongoServer: MongoMemoryServer;

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.INTEGRATION_TEST = 'true'; // Flag to avoid importing mocks
process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests-very-long-and-secure-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-integration-tests-very-long-and-secure-key';
process.env.BCRYPT_SALT_ROUNDS = '4';

// Disable rate limiting for tests
process.env.DISABLE_RATE_LIMIT = 'true';

// Configure Redis for tests
if (process.env.CI) {
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
} else {
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
}

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
        let mongoUri: string;

        // Check if we're in CI environment or if MONGODB_URI is already set
        if (process.env.CI || process.env.MONGODB_URI) {
            // Use real MongoDB connection for CI or when MONGODB_URI is provided
            mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test-integration';
            console.log('🔧 Using real MongoDB connection for integration tests');
        } else {
            // Use MongoDB Memory Server for local development
            console.log('🧪 Starting MongoDB Memory Server for integration tests');
            mongoServer = await MongoMemoryServer.create({
                binary: {
                    version: '6.0.0',
                },
            });
            mongoUri = mongoServer.getUri();
        }

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

        // In CI, don't exit the process, just log the error
        if (process.env.CI) {
            console.error('⚠️  Running in CI environment - continuing without database setup');
            return;
        }

        process.exit(1);
    }
}, 60000);

afterAll(async () => {
    try {
        // Disconnect from database
        await mongoose.disconnect();

        // Stop MongoDB Memory Server only if it was created
        if (mongoServer) {
            await mongoServer.stop();
        }

        console.log('✅ Test database disconnected');
    } catch (error) {
        console.error('❌ Failed to cleanup test database:', error);
    }
}, 30000);

beforeEach(async () => {
    // Only clear collections if we have a database connection
    if (mongoose.connection.readyState === 1) {
        // Clear all collections before each test
        const collections = mongoose.connection.collections;

        for (const key in collections) {
            const collection = collections[key];
            await collection.deleteMany({});
        }
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
