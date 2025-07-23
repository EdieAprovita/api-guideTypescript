import TokenService from '../services/TokenService';
import { faker } from '@faker-js/faker';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_12345';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_12345';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

describe('Redis Mock Debug Test', () => {
    it('should store and retrieve tokens correctly', async () => {
        const userId = faker.database.mongodbObjectId();
        const email = 'test@example.com';
        const role = 'user';

        console.log('=== DEBUG: Testing Redis mock ===');
        console.log('userId:', userId);
        console.log('email:', email);
        console.log('role:', role);

        // Generate token pair
        const tokens = await TokenService.generateTokenPair({
            userId,
            email,
            role,
        });

        console.log('=== DEBUG: Tokens generated ===');
        console.log('accessToken length:', tokens.accessToken.length);
        console.log('refreshToken length:', tokens.refreshToken.length);

        // Verify refresh token
        const refreshPayload = await TokenService.verifyRefreshToken(tokens.refreshToken);
        console.log('=== DEBUG: Refresh token verified ===');
        console.log('refreshPayload.userId:', refreshPayload.userId);
        console.log('refreshPayload.email:', refreshPayload.email);
        console.log('refreshPayload.role:', refreshPayload.role);

        // Assertions
        expect(refreshPayload.userId).toBe(userId);
        expect(refreshPayload.email).toBe(email);
        expect(refreshPayload.role).toBe(role);
    });
});
