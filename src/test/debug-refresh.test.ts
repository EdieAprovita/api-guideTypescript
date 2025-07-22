import request from 'supertest';
import app from '../app';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_12345';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_12345';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

describe('Debug Refresh Token Test', () => {
    it('should test refresh token endpoint directly', async () => {
        // Test with a mock refresh token
        const mockRefreshToken = 'mock-refresh-token-test-user-id';

        console.log('=== DEBUG: Testing refresh token endpoint ===');
        console.log('Mock refresh token:', mockRefreshToken);

        const response = await request(app)
            .post('/api/v1/auth/refresh-token')
            .set('User-Agent', 'test-agent')
            .set('API-Version', 'v1')
            .send({
                refreshToken: mockRefreshToken,
            });

        console.log('=== DEBUG: Response ===');
        console.log('Status:', response.status);
        console.log('Body:', JSON.stringify(response.body, null, 2));

        // Don't assert anything, just log the results
        expect(response.status).toBeDefined();
    });
});
