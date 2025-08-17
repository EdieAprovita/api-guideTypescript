/**
 * Integration Test Setup
 * Configures environment and mocks for integration tests
 */

import { beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

// Setup test environment variables
const setupTestEnvironment = (): void => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-key-12345';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-12345';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.BCRYPT_SALT_ROUNDS = '4';
    process.env.REDIS_HOST = '127.0.0.1';
    process.env.REDIS_PORT = '6379';
    process.env.REDIS_PASSWORD = 'test-redis-password';
    process.env.EMAIL_USER = 'test@example.com';
    process.env.EMAIL_PASS = 'test-email-password';
    process.env.CLIENT_URL = 'http://localhost:3000';
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/test-integration-db';
};

// Setup MongoDB in-memory server
const setupDatabase = async (): Promise<void> => {
    try {
        mongoServer = await MongoMemoryServer.create({
            binary: { version: '6.0.0' },
            instance: { dbName: 'test-integration-db' },
        });

        const mongoUri = mongoServer.getUri();
        process.env.MONGODB_URI = mongoUri;

        await mongoose.connect(mongoUri, {
            maxPoolSize: 1,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 10000,
        });

        console.log('✅ Test database connected');
    } catch (error) {
        console.error('❌ Test database setup failed:', error);
        throw error;
    }
};

// Teardown database
const teardownDatabase = async (): Promise<void> => {
    try {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }

        if (mongoServer) {
            await mongoServer.stop();
        }

        console.log('✅ Test database disconnected');
    } catch (error) {
        console.error('❌ Test database teardown failed:', error);
    }
};

// Clear database before each test
const clearDatabase = async (): Promise<void> => {
    try {
        if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
            const collections = mongoose.connection.db.collections();
            for (const collection of await collections) {
                await collection.deleteMany({});
            }
        }
    } catch (error) {
        console.error('❌ Database clear failed:', error);
    }
};

// Setup mocks
const setupMocks = (): void => {
    // Mock Redis to prevent real connections
    vi.mock('ioredis', () => {
        const mockRedis = vi.fn().mockImplementation(() => ({
            connect: vi.fn().mockResolvedValue(undefined),
            disconnect: vi.fn().mockResolvedValue(undefined),
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn().mockResolvedValue('OK'),
            del: vi.fn().mockResolvedValue(1),
            exists: vi.fn().mockResolvedValue(0),
            expire: vi.fn().mockResolvedValue(1),
            ttl: vi.fn().mockResolvedValue(-1),
            keys: vi.fn().mockResolvedValue([]),
            flushdb: vi.fn().mockResolvedValue('OK'),
            ping: vi.fn().mockResolvedValue('PONG'),
            status: 'ready',
            on: vi.fn().mockReturnThis(),
            off: vi.fn().mockReturnThis(),
            emit: vi.fn().mockReturnThis(),
        }));

        return {
            __esModule: true,
            default: mockRedis,
        };
    });

    // Mock CacheService
    vi.mock('../../services/CacheService', () => ({
        __esModule: true,
        CacheService: vi.fn().mockImplementation(() => ({
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn().mockResolvedValue(true),
            invalidate: vi.fn().mockResolvedValue(true),
            invalidatePattern: vi.fn().mockResolvedValue(true),
            invalidateByTag: vi.fn().mockResolvedValue(true),
            getStats: vi.fn().mockResolvedValue({
                hitRatio: 0,
                totalRequests: 0,
                cacheSize: 0,
                memoryUsage: '0MB',
                uptime: 0,
            }),
            isHealthy: vi.fn().mockResolvedValue(true),
            disconnect: vi.fn().mockResolvedValue(undefined),
        })),
        default: {
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn().mockResolvedValue(true),
            invalidate: vi.fn().mockResolvedValue(true),
            invalidatePattern: vi.fn().mockResolvedValue(true),
            invalidateByTag: vi.fn().mockResolvedValue(true),
            getStats: vi.fn().mockResolvedValue(true),
            isHealthy: vi.fn().mockResolvedValue(true),
            disconnect: vi.fn().mockResolvedValue(undefined),
        },
    }));

    // Mock CacheAlertService
    vi.mock('../../services/CacheAlertService', () => ({
        __esModule: true,
        default: {
            checkMetrics: vi.fn().mockResolvedValue(undefined),
            isHealthy: vi.fn().mockResolvedValue(true),
        },
    }));

    // Mock rate limiting
    vi.mock('express-rate-limit', () => ({
        default: vi.fn(() => (req: unknown, res: unknown, next: () => void) => next()),
    }));
};

// Global setup
beforeAll(async () => {
    setupTestEnvironment();
    setupMocks();
    await setupDatabase();
});

// Global teardown
afterAll(async () => {
    await teardownDatabase();
});

// Setup before each test
beforeEach(async () => {
    await clearDatabase();
});

export { setupTestEnvironment, setupDatabase, teardownDatabase, clearDatabase, setupMocks };
