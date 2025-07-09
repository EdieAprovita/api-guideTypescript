import request from 'supertest';
import { createRequire } from 'module';
import { faker } from '@faker-js/faker';
const require = createRequire(import.meta.url);

// Import the compiled JS app instead of TS
const { default: app } = await import('./dist/app.js');

async function test() {
  try {
    console.log('Testing registration...');
    
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: faker.internet.password({ length: 12 }) + 'A1!',
      role: 'user'
    };

    const response = await request(app)
      .post('/api/v1/users/register')
      .send(userData);

    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
    console.log('Body:', JSON.stringify(response.body, null, 2));
    
    if (response.status >= 400) {
      console.log('Error response');
    }
  } catch (error) {
    console.error('Test error:', error);
  }
}

test();
