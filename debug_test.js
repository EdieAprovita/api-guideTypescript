const request = require('supertest');
const app = require('./src/app.js');

async function debugTest() {
  try {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPassword123!',
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
