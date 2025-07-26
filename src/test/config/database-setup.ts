import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Set consistent faker seed for reproducible tests
faker.seed(12345);

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

export const setupTestEnvironment = () => {
    // Core test environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_12345';
    process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_12345';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.BCRYPT_SALT_ROUNDS = '10';

    // Database configuration
    process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test-db';

    // Disable Redis for tests (use in-memory mock)
    process.env.REDIS_HOST = '';
    process.env.REDIS_PORT = '';

    // Email configuration
    process.env.EMAIL_USER = 'test@example.com';
    process.env.EMAIL_PASS = 'test_password';
    process.env.CLIENT_URL = 'http://localhost:3000';

    // Disable binary downloads in CI
    process.env.MONGOMS_DISABLE_POSTINSTALL = '1';
};

// ============================================================================
// DATABASE SETUP
// ============================================================================

let mongoServer: MongoMemoryServer;

export const setupDatabase = async () => {
    if (!process.env.MONGODB_URI?.includes('localhost')) {
        try {
            mongoServer = await MongoMemoryServer.create({
                binary: { version: '6.0.0' },
                instance: { dbName: 'test-integration-db' },
            });

            const mongoUri = mongoServer.getUri();
            process.env.MONGODB_URI = mongoUri;
            console.log('✅ MongoDB Memory Server started:', mongoUri);
        } catch (error) {
            console.error('❌ Failed to start MongoDB Memory Server:', error);
            throw error;
        }
    }
};

export const teardownDatabase = async () => {
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
    }

    if (mongoServer) {
        try {
            await mongoServer.stop();
            console.log('✅ MongoDB Memory Server stopped');
        } catch (error) {
            console.error('❌ Error stopping MongoDB Memory Server:', error);
        }
    }
};

export const clearDatabase = async () => {
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        const collections = mongoose.connection.db.collections();
        for (const collection of await collections) {
            await collection.deleteMany({});
        }
    }
};

// ============================================================================
// GLOBAL SETUP/TEARDOWN
// ============================================================================

export default async function setup() {
    setupTestEnvironment();
    await setupDatabase();
}

export async function teardown() {
    await teardownDatabase();
}
