const request = require('supertest');
const app = require('./src/app.js');
const { faker } = require('@faker-js/faker');

async function debugTest() {
  try {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: faker.internet.password({ length: 12 }) + 'A1!',
      role: 'user'
    };

    const response = await request(app.default)
      .post('/api/v1/users/register')
      .send(userData);

    console.log('Status:', response.status);
    console.log('Body:', JSON.stringify(response.body, null, 2));
    console.log('Headers:', response.headers);
  } catch (error) {
    console.error('Error:', error);
  }
}

debugTest();
