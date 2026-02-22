import request from 'supertest';
import app from './src/app.js';

async function run() {
    process.env.NODE_ENV = 'test';
    const timestamp = Date.now();
    const userData = {
        username: `testuser_${timestamp}`,
        email: `invalid-email`,
        password: 'TestPassword123!',
    };
    const response = await request(app).post('/api/v1/users/register').send(userData);
    console.log('STATUS:', response.status);
    console.log('BODY:', JSON.stringify(response.body, null, 2));
    process.exit(0);
}
run();
