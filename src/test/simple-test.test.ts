import request from 'supertest';
import app from '../app';

// Set environment to test
process.env.NODE_ENV = 'test';

describe('Simple API Test', () => {
    it('should respond to basic API endpoint', async () => {
        console.log('NODE_ENV:', process.env.NODE_ENV);
        console.log('Making request to /api/v1...');
        
        const response = await request(app)
            .get('/api/v1')
            .set('User-Agent', 'test-agent')
            .set('API-Version', 'v1');
        
        console.log('Response status:', response.status);
        console.log('Response body:', response.body);
        
        expect(response.status).toBe(200);
    });
});
