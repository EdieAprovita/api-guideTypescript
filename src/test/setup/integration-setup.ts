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
beforeAll(
    async () => {
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

                const mongoConfig: any = {
                    instance: {
                        dbName: 'test-integration',
                        port: undefined, // Let system choose port
                    },
                    binary: {
                        version: process.env.MONGODB_MEMORY_SERVER_VERSION || '6.0.0',
                        downloadDir: process.env.MONGODB_MEMORY_SERVER_DOWNLOAD_DIR || undefined,
                    },
                    autoStart: true,
                };

                // CI-specific configuration
                if (process.env.CI) {
                    mongoConfig.binary.downloadDir =
                        process.env.MONGODB_MEMORY_SERVER_DOWNLOAD_DIR || '~/.cache/mongodb-binaries';
                    mongoConfig.instance.port = undefined;
                }

                mongoServer = await MongoMemoryServer.create(mongoConfig);
                mongoUri = mongoServer.getUri();
            }

            process.env.MONGODB_URI = mongoUri;

            // Connect to the test database with robust configuration
            await mongoose.connect(mongoUri, {
                maxPoolSize: 1,
                serverSelectionTimeoutMS: process.env.CI ? 15000 : 5000,
                socketTimeoutMS: process.env.CI ? 15000 : 5000,
                connectTimeoutMS: process.env.CI ? 15000 : 5000,
                retryWrites: false,
                retryReads: false,
            });

            console.log('✅ Test database connected');
        } catch (error) {
            console.error('❌ Failed to setup test database:', error);

            // Try fallback configuration
            try {
                console.log('🔄 Attempting fallback MongoDB configuration...');

                if (!mongoServer) {
                    mongoServer = await MongoMemoryServer.create({
                        instance: {
                            dbName: 'test-integration',
                        },
                        binary: {
                            version: '5.0.19', // Fallback to older version
                        },
                    });
                }

                const mongoUri = mongoServer.getUri();
                process.env.MONGODB_URI = mongoUri;

                await mongoose.connect(mongoUri, {
                    maxPoolSize: 1,
                    serverSelectionTimeoutMS: 20000,
                    socketTimeoutMS: 20000,
                    connectTimeoutMS: 20000,
                    retryWrites: false,
                    retryReads: false,
                });

                console.log('✅ Test database connected with fallback configuration');
            } catch (fallbackError) {
                console.error('❌ Fallback configuration also failed:', fallbackError);

                // In CI, don't exit the process, just log the error
                if (process.env.CI) {
                    console.error('⚠️  Running in CI environment - continuing without database setup');
                    return;
                }

                process.exit(1);
            }
        }
    },
    process.env.CI ? 90000 : 60000
); // Longer timeout for CI

afterAll(
    async () => {
        try {
            // Disconnect from database
            if (mongoose.connection.readyState !== 0) {
                await mongoose.disconnect();
            }

            // Stop MongoDB Memory Server only if it was created
            if (mongoServer) {
                await mongoServer.stop();
            }

            console.log('✅ Test database disconnected');
        } catch (error) {
            console.error('❌ Failed to cleanup test database:', error);
        }
    },
    process.env.CI ? 30000 : 15000
);

beforeEach(async () => {
    // Only clear collections if we have a database connection
    if (mongoose.connection.readyState === 1) {
        try {
            // Clear all collections before each test
            const collections = mongoose.connection.collections;

            for (const key in collections) {
                const collection = collections[key];
                await collection.deleteMany({});
            }
        } catch (error) {
            console.warn('⚠️  Failed to clear collections:', error);
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
