import request from 'supertest';
import app from '../app';
import { connect, closeDatabase, clearDatabase } from './integration/helpers/testDb';

// Set environment to test
process.env.NODE_ENV = 'test';

describe('Simple Registration Test', () => {
    beforeAll(async () => {
        await connect();
    });

    afterEach(async () => {
        await clearDatabase();
    });

    afterAll(async () => {
        await closeDatabase();
    });

    it('should register a new user', async () => {
        console.log('NODE_ENV:', process.env.NODE_ENV);
        console.log('Making registration request...');
        
        const userData = {
            username: 'testuser',
            email: 'test@example.com',
            password: 'SecurePassword123!',
            role: 'user'
        };
        
        console.log('User data:', userData);
        
        const response = await request(app)
            .post('/api/v1/users/register')
            .set('User-Agent', 'test-agent')
            .set('API-Version', 'v1')
            .send(userData);
        
        console.log('Response status:', response.status);
        console.log('Response body:', response.body);
        
        expect(response.status).toBe(201);
    });
});
