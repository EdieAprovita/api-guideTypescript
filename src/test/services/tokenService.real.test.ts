import TokenService from '../../services/TokenService';
import { faker } from '@faker-js/faker';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_12345';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_12345';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

// Temporarily restore the real JWT module for this test
const originalJWT = jest.requireActual('jsonwebtoken');
jest.doMock('jsonwebtoken', () => originalJWT);

describe('TokenService Real Tests', () => {
    it('should generate tokens with correct userId using real JWT', async () => {
        const userId = faker.database.mongodbObjectId();
        const email = 'test@example.com';
        const role = 'user';

        console.log('=== DEBUG: Generating tokens with real JWT ===');
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

        // Verify access token
        const accessPayload = await TokenService.verifyAccessToken(tokens.accessToken);
        console.log('=== DEBUG: Access token payload ===');
        console.log('accessPayload.userId:', accessPayload.userId);
        console.log('accessPayload.email:', accessPayload.email);
        console.log('accessPayload.role:', accessPayload.role);

        // Verify refresh token
        const refreshPayload = await TokenService.verifyRefreshToken(tokens.refreshToken);
        console.log('=== DEBUG: Refresh token payload ===');
        console.log('refreshPayload.userId:', refreshPayload.userId);
        console.log('refreshPayload.email:', refreshPayload.email);
        console.log('refreshPayload.role:', refreshPayload.role);

        // Assertions
        expect(accessPayload.userId).toBe(userId);
        expect(accessPayload.email).toBe(email);
        expect(accessPayload.role).toBe(role);

        expect(refreshPayload.userId).toBe(userId);
        expect(refreshPayload.email).toBe(email);
        expect(refreshPayload.role).toBe(role);
    });
});
