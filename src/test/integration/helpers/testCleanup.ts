import mongoose from 'mongoose';

// Database cleanup utility for integration tests
export const cleanupDatabase = async () => {
    try {
        if (mongoose.connection && mongoose.connection.db) {
            const collections = await mongoose.connection.db.collections();
            for (const collection of collections) {
                await collection.deleteMany({});
            }
            console.log('Database cleaned after test');
        }
    } catch (error) {
        console.error('Error cleaning database:', error);
    }
};

// Jest hook for automatic cleanup after each test
export const setupTestCleanup = () => {
    afterEach(async () => {
        await cleanupDatabase();
    });
};
