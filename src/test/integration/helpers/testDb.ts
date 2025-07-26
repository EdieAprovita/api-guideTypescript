import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

/**
 * Connect to a local MongoDB instance for testing (fallback option)
 */
export const connectToLocalDB = async (): Promise<void> => {
    try {
        // Skip if already connected
        if (mongoose.connection.readyState === 1) {
            return;
        }

        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test-db';
        
        await mongoose.connect(mongoUri, {
            maxPoolSize: 1,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 10000,
            connectTimeoutMS: 10000,
            retryWrites: true,
            retryReads: true,
        });
    } catch (error) {
        throw error;
    }
};

/**
 * Connect to the in-memory database
 */
export const connect = async (): Promise<void> => {
    try {
        // Skip if already connected
        if (mongoose.connection.readyState === 1) {
            return;
        }

        // Create MongoMemoryServer instance with default configuration.
        // Simplified config prevents binary incompatibilities (e.g. on macOS-ARM)
        // and avoids custom storageEngine flags that cause UnexpectedCloseError.
        mongoServer = await MongoMemoryServer.create({
            instance: {
                dbName: 'vegan-guide-test',
            },
            // Let mongodb-memory-server pick the correct binary automatically.
        });

        const uri = mongoServer.getUri();

        await mongoose.connect(uri, {
            maxPoolSize: 1,
            serverSelectionTimeoutMS: 30000, // Increased from 10000
            socketTimeoutMS: 30000, // Increased from 10000
            connectTimeoutMS: 30000, // Added explicit connect timeout
            // Add retry logic
            retryWrites: true,
            retryReads: true,
        });
    } catch (error) {
        // If memory server fails, try to use a local MongoDB instance as fallback
        if (process.env.MONGODB_URI) {
            try {
                await mongoose.connect(process.env.MONGODB_URI, {
                    maxPoolSize: 1,
                    serverSelectionTimeoutMS: 10000,
                    socketTimeoutMS: 10000,
                });
                return;
            } catch (fallbackError) {
                // Silent fallback failure, will throw original error
            }
        }

        throw error;
    }
};

/**
 * Drop database, close the connection and stop mongoServer
 */
export const closeDatabase = async (): Promise<void> => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    }

    if (mongoServer) {
        await mongoServer.stop();
    }
};

/**
 * Remove all the data for all db collections
 */
export const clearDatabase = async (): Promise<void> => {
    try {
        const collections = mongoose.connection.collections;

        // Wait for all collections to be cleared
        const clearPromises = Object.keys(collections).map(async key => {
            const collection = collections[key];
            try {
                await collection.deleteMany({});
            } catch (error) {
                // Silent failure - individual collection errors don't need to be logged
            }
        });

        await Promise.all(clearPromises);
    } catch (error) {
        throw error;
    }
};

/**
 * Create a mongoose connection for testing
 */
export const createTestConnection = async (): Promise<typeof mongoose> => {
    await connect();
    return mongoose;
};

/**
 * Setup test database - alias for connect
 */
export const setupTestDb = connect;

/**
 * Teardown test database - alias for closeDatabase
 */
export const teardownTestDb = closeDatabase;
