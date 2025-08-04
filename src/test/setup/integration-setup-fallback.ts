import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

let mongoServer: MongoMemoryServer;
let useMocks = false;

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.INTEGRATION_TEST = 'true';
process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests-very-long-and-secure-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-integration-tests-very-long-and-secure-key';
process.env.BCRYPT_SALT_ROUNDS = '4';
process.env.DISABLE_RATE_LIMIT = 'true';

// Database setup for integration tests with fallback to mocks
beforeAll(async () => {
    try {
        let mongoUri: string;

        // Check if we're in CI environment or if MONGODB_URI is already set
        if (process.env.CI || process.env.MONGODB_URI) {
            // Use real MongoDB connection for CI or when MONGODB_URI is provided
            mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test-integration';
            console.log('🔧 Using real MongoDB connection for integration tests');
        } else {
            // Use MongoDB Memory Server for local development
            console.log('🧪 Starting MongoDB Memory Server for integration tests');
            try {
                mongoServer = await MongoMemoryServer.create({
                    binary: {
                        version: '6.0.0',
                    },
                });
                mongoUri = mongoServer.getUri();
            } catch (memoryServerError) {
                console.warn('⚠️  MongoDB Memory Server failed, falling back to mocks');
                useMocks = true;
                setupMocks();
                return;
            }
        }

        process.env.MONGODB_URI = mongoUri;

        // Try to connect to the test database
        try {
            await mongoose.connect(mongoUri, {
                maxPoolSize: 1,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 5000,
            });
            console.log('✅ Test database connected');
        } catch (connectionError) {
            console.warn('⚠️  Database connection failed, falling back to mocks');
            useMocks = true;
            setupMocks();
        }
    } catch (error) {
        console.error('❌ Failed to setup test database:', error);
        console.warn('⚠️  Falling back to mocks for integration tests');
        useMocks = true;
        setupMocks();
    }
}, 60000);

afterAll(async () => {
    try {
        if (!useMocks) {
            // Disconnect from database
            await mongoose.disconnect();

            // Stop MongoDB Memory Server only if it was created
            if (mongoServer) {
                await mongoServer.stop();
            }
        }

        console.log('✅ Test cleanup completed');
    } catch (error) {
        console.error('❌ Failed to cleanup test database:', error);
    }
}, 30000);

beforeEach(async () => {
    if (!useMocks && mongoose.connection.readyState === 1) {
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
});

function setupMocks() {
    console.log('🎭 Setting up mocks for integration tests');

    // Clear all mocks and set up mock implementations
    vi.clearAllMocks();
    vi.resetAllMocks();

    // Mock mongoose connection
    vi.mock('mongoose', () => ({
        default: {
            connect: vi.fn().mockResolvedValue(undefined),
            disconnect: vi.fn().mockResolvedValue(undefined),
            connection: {
                readyState: 1,
                collections: {},
            },
        },
    }));

    // Mock User model
    vi.mock('../../models/User', () => ({
        default: {
            create: vi.fn(),
            findById: vi.fn(),
            findOne: vi.fn(),
            find: vi.fn(),
            findByIdAndUpdate: vi.fn(),
            findByIdAndDelete: vi.fn(),
            deleteOne: vi.fn(),
            countDocuments: vi.fn(),
        },
    }));

    // Mock other models as needed
    const models = [
        'Business',
        'Restaurant',
        'Review',
        'Doctor',
        'Market',
        'Sanctuary',
        'Recipe',
        'Post',
        'Profession',
        'ProfessionProfile',
    ];

    models.forEach(modelName => {
        vi.mock(`../../models/${modelName}`, () => ({
            default: {
                create: vi.fn(),
                findById: vi.fn(),
                findOne: vi.fn(),
                find: vi.fn(),
                findByIdAndUpdate: vi.fn(),
                findByIdAndDelete: vi.fn(),
                deleteOne: vi.fn(),
                countDocuments: vi.fn(),
            },
        }));
    });

    console.log('✅ Mocks setup completed');
}
