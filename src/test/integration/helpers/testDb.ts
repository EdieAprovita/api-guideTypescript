import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

/**
 * Connect to the in-memory database
 */
export const connect = async (): Promise<void> => {
  // Skip if already connected
  if (mongoose.connection.readyState === 1) {
    return;
  }
  
  // Create mongo memory server instance with timeout
  mongoServer = await MongoMemoryServer.create({
    instance: {
      storageEngine: 'wiredTiger',
    },
  });
  
  const uri = mongoServer.getUri();
  
  await mongoose.connect(uri, {
    maxPoolSize: 1,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 10000,
  });
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