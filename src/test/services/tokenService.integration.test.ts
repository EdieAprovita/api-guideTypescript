import { faker } from '@faker-js/faker';
import TokenService from '../../services/TokenService';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_12345';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_12345';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

describe('TokenService Integration Tests', () => {
    beforeEach(async () => {
        // Clear any existing tokens - skip if method doesn't exist
        try {
            await TokenService.clearAllForTesting();
        } catch (error) {
            // Ignore errors in test environment
        }
    });

    afterAll(async () => {
        // Cleanup - skip if method doesn't exist
        try {
            await TokenService.disconnect();
        } catch (error) {
            // Ignore errors in test environment
        }
    });

    it('should generate and verify refresh token correctly', async () => {
        const userId = faker.database.mongodbObjectId();
        const email = faker.internet.email();
        const role = 'user';

        // Generate token pair
        const tokens = await TokenService.generateTokenPair({
            userId,
            email,
            role,
        });

        expect(tokens.accessToken).toBeDefined();
        expect(tokens.refreshToken).toBeDefined();

        // Verify refresh token
        const payload = await TokenService.verifyRefreshToken(tokens.refreshToken);

        expect(payload.userId).toBe(userId);
        expect(payload.email).toBe(email);
        expect(payload.role).toBe(role);
    });

    it('should refresh tokens correctly', async () => {
        const userId = faker.database.mongodbObjectId();
        const email = faker.internet.email();
        const role = 'user';

        // Generate initial tokens
        const initialTokens = await TokenService.generateTokenPair({
            userId,
            email,
            role,
        });

        // Refresh tokens
        const newTokens = await TokenService.refreshTokens(initialTokens.refreshToken);

        expect(newTokens.accessToken).toBeDefined();
        expect(newTokens.refreshToken).toBeDefined();
        expect(newTokens.accessToken).not.toBe(initialTokens.accessToken);
        expect(newTokens.refreshToken).not.toBe(initialTokens.refreshToken);

        // Old refresh token should be invalid
        await expect(TokenService.verifyRefreshToken(initialTokens.refreshToken)).rejects.toThrow();
    });

    it('should blacklist tokens correctly', async () => {
        const userId = faker.database.mongodbObjectId();
        const email = faker.internet.email();
        const role = 'user';

        const tokens = await TokenService.generateTokenPair({
            userId,
            email,
            role,
        });

        // Blacklist the access token
        await TokenService.blacklistToken(tokens.accessToken);

        // Verify it's blacklisted
        const isBlacklisted = await TokenService.isTokenBlacklisted(tokens.accessToken);
        expect(isBlacklisted).toBe(true);
    });

    it('should revoke all user tokens correctly', async () => {
        const userId = faker.database.mongodbObjectId();
        const email = faker.internet.email();
        const role = 'user';

        const tokens = await TokenService.generateTokenPair({
            userId,
            email,
            role,
        });

        // Revoke all tokens
        await TokenService.revokeAllUserTokens(userId);

        // Verify tokens are revoked
        const areRevoked = await TokenService.isUserTokensRevoked(userId);
        expect(areRevoked).toBe(true);
    });
});
