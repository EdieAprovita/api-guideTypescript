import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

/**
 * Connect to the in-memory database
 */
export const connect = async (): Promise<void> => {
  try {
    // Skip if already connected
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return;
    }
    
    console.log('Connecting to MongoDB memory server...');
    
    // Create mongo memory server instance with timeout
    mongoServer = await MongoMemoryServer.create({
      instance: {
        storageEngine: 'wiredTiger',
      },
    });
    
    const uri = mongoServer.getUri();
    console.log('MongoDB memory server URI:', uri);
    
    await mongoose.connect(uri, {
      maxPoolSize: 1,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
    });
    
    console.log('Connected to MongoDB memory server successfully');
    console.log('Connection state:', mongoose.connection.readyState);
  } catch (error) {
    console.error('Error connecting to MongoDB memory server:', error);
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
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
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