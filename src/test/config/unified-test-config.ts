/**
 * Unified Test Configuration - Clean and Simplified Test Setup
 *
 * This replaces the bloated master-test-config.ts with a minimal, focused approach.
 * Only includes what's actually needed for testing.
 */

import { vi } from 'vitest';
import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { mockFactory } from '../mocks/unified-mock-factory';
import testConfig from '../testConfig';
import type { TestContext, TestSetupOptions } from '../types/test-types';

// ============================================================================
// ESSENTIALS ONLY
// ============================================================================

export { TEST_CONSTANTS } from '../types/test-types';
export { mockFactory } from '../mocks/unified-mock-factory';

faker.seed(12345);
let mongoServer: MongoMemoryServer | null = null;

// ============================================================================
// MINIMAL ENVIRONMENT SETUP
// ============================================================================

function setupTestEnvironment(): void {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test_secret_12345';
    process.env.JWT_REFRESH_SECRET = 'test_refresh_12345';
    process.env.BCRYPT_SALT_ROUNDS = '4';

    // Prevent Redis connections
    process.env.REDIS_HOST = 'mock-redis';
    process.env.REDIS_PORT = '9999';
    process.env.REDIS_PASSWORD = testConfig.generateTestPassword();
}

// ============================================================================
// FOCUSED MOCK SETUP - Only what we need
// ============================================================================

function setupCoreMocks(): void {
    // Only mock external dependencies that cause real connections
    vi.mock('ioredis', () => mockFactory.createRedisMockModule());
    vi.mock('../../utils/logger', () => mockFactory.createLoggerMockModule());

    // Never mock jsonwebtoken - always use real implementation
    // vi.mock('jsonwebtoken', () => mockFactory.createJWTMockModule());

    // Services that connect to external resources
    vi.mock('../../services/BaseService', () => ({
        __esModule: true,
        default: class BaseService {
            async findAll() {
                return [];
            }
            async findById() {
                return null;
            }
            async create() {
                return {};
            }
            async update() {
                return {};
            }
            async delete() {
                return {};
            }
        },
    }));
    vi.mock('../../services/CacheService', () => mockFactory.createCacheServiceMockModule());
    vi.mock('../../services/CacheAlertService', () => mockFactory.createCacheAlertServiceMockModule());

    // Only mock UserService for unit tests, not integration tests
    if (!process.env.INTEGRATION_TEST) {
        vi.mock('../../services/UserService', () => mockFactory.createUserServiceMockModule());
        vi.mock('../../models/User', () => mockFactory.createUserModelMockModule());
    }

    // Never mock TokenService - always use real implementation
    // vi.mock('../../services/TokenService', () => mockFactory.createTokenServiceMockModule());

    // Utilities
    vi.mock('../../utils/generateToken', () => mockFactory.createGenerateTokenMock());
}

// ============================================================================
// DATABASE - Minimal setup
// ============================================================================

async function setupDatabase(): Promise<void> {
    if (mongoose.connection.readyState === 1) return;

    mongoServer = await MongoMemoryServer.create({
        binary: { version: '6.0.0' },
        instance: { dbName: 'test-db' },
    });

    await mongoose.connect(mongoServer.getUri(), {
        maxPoolSize: 1,
        serverSelectionTimeoutMS: 3000,
        socketTimeoutMS: 3000,
    });
}

async function teardownDatabase(): Promise<void> {
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
    }
    if (mongoServer) {
        await mongoServer.stop();
        mongoServer = null;
    }
}

async function clearDatabase(): Promise<void> {
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        const collections = mongoose.connection.db.collections();
        for (const collection of await collections) {
            await collection.deleteMany({});
        }
    }
}

// ============================================================================
// SIMPLE TEST CONTEXT
// ============================================================================

function createTestContext(): TestContext {
    return {
        admin: {
            userId: '507f1f77bcf86cd799439011',
            email: 'admin@test.com',
            token: 'admin_token',
            refreshToken: 'admin_refresh',
            user: {
                _id: '507f1f77bcf86cd799439011',
                userId: '507f1f77bcf86cd799439011',
                username: 'admin',
                email: 'admin@test.com',
                role: 'admin',
                isAdmin: true,
                isActive: true,
                isDeleted: false,
            },
        },
        professional: {
            userId: '507f1f77bcf86cd799439012',
            email: 'pro@test.com',
            token: 'pro_token',
            refreshToken: 'pro_refresh',
            user: {
                _id: '507f1f77bcf86cd799439012',
                userId: '507f1f77bcf86cd799439012',
                username: 'professional',
                email: 'pro@test.com',
                role: 'professional',
                isAdmin: false,
                isActive: true,
                isDeleted: false,
            },
        },
        regularUser: {
            userId: '507f1f77bcf86cd799439013',
            email: 'user@test.com',
            token: 'user_token',
            refreshToken: 'user_refresh',
            user: {
                _id: '507f1f77bcf86cd799439013',
                userId: '507f1f77bcf86cd799439013',
                username: 'user',
                email: 'user@test.com',
                role: 'user',
                isAdmin: false,
                isActive: true,
                isDeleted: false,
            },
        },
    };
}

// ============================================================================
// MAIN SETUP FUNCTION - Clean and Simple
// ============================================================================

export interface TestHooks {
    beforeAll: () => Promise<void>;
    afterAll: () => Promise<void>;
    beforeEach: () => Promise<TestContext>;
}

export function setupTest(options: TestSetupOptions = {}): TestHooks {
    const { withDatabase = false } = options;

    setupTestEnvironment();
    setupCoreMocks();

    if (withDatabase) {
        return {
            beforeAll: setupDatabase,
            afterAll: teardownDatabase,
            beforeEach: async () => {
                await clearDatabase();
                vi.clearAllMocks();
                return createTestContext();
            },
        };
    }

    return {
        beforeAll: async () => {},
        afterAll: async () => {},
        beforeEach: async () => {
            vi.clearAllMocks();
            return createTestContext();
        },
    };
}

export default setupTest;
