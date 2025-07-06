import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

/**
 * Connect to the in-memory database
 */
export const connect = async (): Promise<void> => {
  // Create mongo memory server instance
  mongoServer = await MongoMemoryServer.create();
  
  const uri = mongoServer.getUri();
  
  await mongoose.connect(uri);
};

/**
 * Drop database, close the connection and stop mongoServer
 */
export const closeDatabase = async (): Promise<void> => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
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