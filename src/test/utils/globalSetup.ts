// Global setup for Vitest - runs once before all tests
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer | undefined;

export async function setup() {
    console.log('🔧 Setting up test environment...');
    
    // Start MongoDB Memory Server if not using local MongoDB
    if (!process.env.MONGODB_URI?.includes('localhost')) {
        try {
            mongoServer = await MongoMemoryServer.create({
                binary: {
                    version: '6.0.0',
                },
                instance: {
                    dbName: 'test-db',
                },
            });
            
            const mongoUri = mongoServer.getUri();
            process.env.MONGODB_URI = mongoUri;
            
            console.log('✅ MongoDB Memory Server started:', mongoUri);
        } catch (error) {
            console.error('❌ Failed to start MongoDB Memory Server:', error);
            throw error;
        }
    }
    
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only';
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-purposes-only';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
    process.env.REDIS_PASSWORD = '';
    process.env.PORT = '5001';
    process.env.API_VERSION = 'v1';
    
    console.log('✅ Test environment configured');
}

export async function teardown() {
    console.log('🧹 Tearing down test environment...');
    
    // Stop MongoDB Memory Server
    if (mongoServer) {
        try {
            await mongoServer.stop();
            console.log('✅ MongoDB Memory Server stopped');
        } catch (error) {
            console.error('❌ Error stopping MongoDB Memory Server:', error);
        }
    }
    
    console.log('✅ Test environment cleaned up');
}