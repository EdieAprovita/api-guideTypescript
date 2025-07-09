import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Set up environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_very_long_string_for_jwt';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_very_long_string_for_jwt';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.BCRYPT_SALT_ROUNDS = '10';
process.env.REDIS_HOST = '';
process.env.REDIS_PORT = '';

let mongoServer;

// Connect to MongoDB Memory Server
async function connect() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  console.log('Connected to MongoDB Memory Server');
}

// Import app after setting environment variables
const { default: app } = await import('./dist/app.js');

async function test() {
  try {
    await connect();
    
    console.log('Testing registration...');
    
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPassword123!'
    };

    console.log('Sending request with data:', userData);

    const response = await request(app)
      .post('/api/v1/users/register')
      .send(userData);

    console.log('Response status:', response.status);
    console.log('Response headers:', JSON.stringify(response.headers, null, 2));
    console.log('Response body:', JSON.stringify(response.body, null, 2));
    
    if (response.body.error) {
      console.log('Error:', response.body.error);
    }
    if (response.body.stack) {
      console.log('Stack:', response.body.stack);
    }
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    if (mongoServer) {
      await mongoose.connection.close();
      await mongoServer.stop();
    }
  }
}

test();
