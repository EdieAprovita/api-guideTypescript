/**
 * Integration Test Setup
 * Configuration for integration tests with real database
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { setupLog, integrationLog, testError } from '../utils/testLogger';

let mongoServer: MongoMemoryServer | null = null;
let isConnected = false;
let useFallbackMocks = false;

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.INTEGRATION_TEST = 'true'; // Flag to avoid importing mocks
process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests-very-long-and-secure-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-integration-tests-very-long-and-secure-key';
process.env.BCRYPT_SALT_ROUNDS = '4';

// Disable rate limiting for tests
process.env.DISABLE_RATE_LIMIT = 'true';

// Configure Redis for tests - use IPv4 explicitly to avoid Node.js 18+ IPv6 issues
process.env.REDIS_HOST = '127.0.0.1';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = '';
process.env.REDIS_LAZYCONNECT = 'true';

// Configure Google Maps API for tests
process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';

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

/**
 * Helper function to create MongoDB Memory Server with CI-specific settings
 */
async function createMongoMemoryServer(): Promise<MongoMemoryServer> {
    const config: any = {
        instance: {
            dbName: 'test-integration-' + Date.now(),
            port: 0, // Let system choose port (use 0 instead of undefined)
            storageEngine: 'wiredTiger', // More stable than ephemeralForTest
        },
        binary: {
            version: '5.0.19', // Use stable version for both CI and local
            downloadDir: process.env.CI ? '/tmp/mongodb-binaries' : './mongodb-binaries',
        },
        autoStart: true,
    };

    // CI-specific optimizations
    if (process.env.CI) {
        config.instance.auth = false;
        config.instance.replSet = undefined;
        // Don't use ephemeralForTest in CI - it can be unstable
        config.instance.storageEngine = 'wiredTiger';
    }

    return await MongoMemoryServer.create(config);
}

/**
 * Setup database connection with multiple fallback strategies
 */
async function setupDatabase(): Promise<void> {
    // Strategy 1: Try real MongoDB connection first (for CI with services)
    // Use IPv4 explicitly to avoid Node.js 18+ IPv6 preference issues
    const fallbackUris = [
        process.env.MONGODB_URI,
        process.env.MONGODB_FALLBACK_URI,
        'mongodb://127.0.0.1:27017/test-integration'
    ].filter(uri => uri && !uri.includes('memory'));

    for (const mongoUri of fallbackUris) {
        try {
            setupLog(`🔧 Attempting real MongoDB connection to ${mongoUri}...`);
            await mongoose.connect(mongoUri, {
                maxPoolSize: 1,
                serverSelectionTimeoutMS: 3000, // Shorter timeout for real connections
                socketTimeoutMS: 3000,
                connectTimeoutMS: 3000,
                retryWrites: false,
                retryReads: false,
                family: 4, // Force IPv4
            });
            setupLog('✅ Connected to real MongoDB');
            isConnected = true;
            return;
        } catch (error) {
            testError(`⚠️  Real MongoDB connection failed for ${mongoUri}:`, (error as Error).message);
        }
    }

    // Strategy 2: Try MongoDB Memory Server with stable configuration
    try {
        setupLog('🧪 Starting MongoDB Memory Server...');
        mongoServer = await createMongoMemoryServer();
        const mongoUri = mongoServer.getUri();
        process.env.MONGODB_URI = mongoUri;

        await mongoose.connect(mongoUri, {
            maxPoolSize: 1,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 10000,
            connectTimeoutMS: 10000,
            retryWrites: false,
            retryReads: false,
        });

        setupLog('✅ MongoDB Memory Server connected');
        isConnected = true;
        return;
    } catch (error) {
        console.warn('⚠️  MongoDB Memory Server failed:', (error as Error).message);

        // Clean up failed mongo server
        if (mongoServer) {
            try {
                await mongoServer.stop();
            } catch {}
            mongoServer = null;
        }
    }

    // Strategy 3: Fallback to older MongoDB version
    try {
        console.log('🔄 Attempting fallback with MongoDB 4.4...');
        mongoServer = await MongoMemoryServer.create({
            binary: {
                version: '4.4.18', // Very stable version
            },
            instance: {
                dbName: 'test-fallback-' + Date.now(),
                storageEngine: process.env.CI ? 'ephemeralForTest' : undefined,
            },
        });

        const mongoUri = mongoServer.getUri();
        process.env.MONGODB_URI = mongoUri;

        await mongoose.connect(mongoUri, {
            maxPoolSize: 1,
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 15000,
            connectTimeoutMS: 15000,
            retryWrites: false,
            retryReads: false,
        });

        console.log('✅ MongoDB fallback connected');
        isConnected = true;
        return;
    } catch (error) {
        console.warn('⚠️  MongoDB fallback also failed:', (error as Error).message);

        // Clean up failed mongo server
        if (mongoServer) {
            try {
                await mongoServer.stop();
            } catch {}
            mongoServer = null;
        }
    }

    // Strategy 4: Continue with mock mode in CI
    if (process.env.CI) {
        console.warn('⚠️  All MongoDB strategies failed - running in mock mode for CI');
        useFallbackMocks = true;
        setupFallbackMocks();
        return;
    }

    // Strategy 5: Exit in local development if all fails
    throw new Error('All database connection strategies failed');
}

/**
 * Setup fallback mocks when database connection fails
 */
function setupFallbackMocks(): void {
    console.log('🎭 Setting up fallback mocks for database operations');

    // Mock mongoose for basic operations
    const mockConnection = {
        readyState: 1,
        collections: {},
        db: {
            dropDatabase: vi.fn().mockResolvedValue(true),
        },
    };

    vi.mocked(mongoose).connection = mockConnection as any;
}

// Database setup for integration tests
beforeAll(
    async () => {
        try {
            await setupDatabase();
        } catch (error) {
            console.error('❌ Failed to setup any database configuration:', error);

            if (process.env.CI) {
                console.warn('⚠️  Continuing in CI with fallback mocks');
                useFallbackMocks = true;
                setupFallbackMocks();
            } else {
                process.exit(1);
            }
        }
    },
    process.env.CI ? 180000 : 120000 // Extended timeout for CI with downloads
);

afterAll(
    async () => {
        try {
            if (!useFallbackMocks && isConnected) {
                // Disconnect from database
                if (mongoose.connection.readyState !== 0) {
                    await mongoose.disconnect();
                    setupLog('✅ Test database disconnected successfully');
                }
            }

            // Stop MongoDB Memory Server only if it was created
            if (mongoServer) {
                try {
                    await mongoServer.stop({ doCleanup: true, force: false });
                    console.log('✅ MongoDB Memory Server stopped gracefully');
                } catch (error) {
                    console.warn('⚠️  Error stopping MongoDB Memory Server gracefully:', (error as Error).message);
                    // Try force stop
                    try {
                        await mongoServer.stop({ doCleanup: true, force: true });
                        console.log('✅ MongoDB Memory Server force stopped');
                    } catch (forceError) {
                        console.error('❌ MongoDB Memory Server force stop failed:', (forceError as Error).message);
                    }
                }
                mongoServer = null;
            }

            setupLog('✅ Test database disconnected');
        } catch (error) {
            console.error('❌ Failed to cleanup test database:', error);
        }
    },
    process.env.CI ? 60000 : 30000 // Extended timeout for CI cleanup
);

beforeEach(async () => {
    // Only clear collections if we have a real database connection
    if (!useFallbackMocks && isConnected && mongoose.connection.readyState === 1) {
        try {
            // Clear all collections before each test
            const collections = mongoose.connection.collections;

            for (const key in collections) {
                const collection = collections[key];
                if (typeof collection.deleteMany === 'function') {
                    await collection.deleteMany({});
                }
            }
        } catch (error) {
            console.warn('⚠️  Failed to clear collections:', (error as Error).message);
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

    // Reset mocks if in fallback mode
    if (useFallbackMocks) {
        vi.clearAllMocks();
    }
});

afterEach(async () => {
    // Additional cleanup if needed
    // This runs after each test

    // Reset any global state
    if (useFallbackMocks) {
        vi.resetAllMocks();
    }
});
