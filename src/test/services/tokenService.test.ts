import { vi, describe, it, expect, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_12345';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_12345';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

// IMPORTANT: Unmock TokenService and jsonwebtoken for this test file
vi.doUnmock('../../services/TokenService');
vi.doUnmock('jsonwebtoken');

describe('TokenService', () => {
    let tokenService: typeof import('../../services/TokenService').default;

    beforeEach(async () => {
        // Clear all mocks
        vi.clearAllMocks();

        // Import TokenService (singleton instance)
        tokenService = (await import('../../services/TokenService')).default;

        // Clear test data
        if (tokenService.clearAllForTesting) {
            await tokenService.clearAllForTesting();
        }
    });

    describe('Token Generation', () => {
        it('should generate valid token pair', async () => {
            const payload = {
                userId: faker.database.mongodbObjectId(),
                email: faker.internet.email(),
                role: 'user',
            };

            const tokens = await tokenService.generateTokenPair(payload);

            expect(tokens.accessToken).toBeDefined();
            expect(tokens.refreshToken).toBeDefined();
            expect(typeof tokens.accessToken).toBe('string');
            expect(typeof tokens.refreshToken).toBe('string');
            expect(tokens.accessToken.split('.').length).toBe(3); // JWT format
            expect(tokens.refreshToken.split('.').length).toBe(3); // JWT format
        });

        it('should handle optional role', async () => {
            const payload = {
                userId: faker.database.mongodbObjectId(),
                email: faker.internet.email(),
            };

            const tokens = await tokenService.generateTokenPair(payload);
            expect(tokens.accessToken).toBeDefined();
            expect(tokens.refreshToken).toBeDefined();
        });
    });

    describe('Token Verification', () => {
        it('should verify valid access token', async () => {
            const payload = {
                userId: faker.database.mongodbObjectId(),
                email: faker.internet.email(),
                role: 'admin',
            };

            const tokens = await tokenService.generateTokenPair(payload);
            const verified = await tokenService.verifyAccessToken(tokens.accessToken);

            expect(verified.userId).toBe(payload.userId);
            expect(verified.email).toBe(payload.email);
            expect(verified.role).toBe(payload.role);
        });

        it('should verify valid refresh token', async () => {
            const payload = {
                userId: faker.database.mongodbObjectId(),
                email: faker.internet.email(),
                role: 'user',
            };

            const tokens = await tokenService.generateTokenPair(payload);
            const verified = await tokenService.verifyRefreshToken(tokens.refreshToken);

            expect(verified.userId).toBe(payload.userId);
            expect(verified.email).toBe(payload.email);
            expect(verified.role).toBe(payload.role);
            expect(verified.type).toBe('refresh');
        });

        it('should reject invalid tokens', async () => {
            await expect(tokenService.verifyAccessToken('invalid-token')).rejects.toThrow(
                /Invalid or expired access token/
            );

            await expect(tokenService.verifyRefreshToken('invalid-token')).rejects.toThrow(
                /Invalid or expired refresh token/
            );
        });

        it('should reject access token as refresh token', async () => {
            const payload = {
                userId: faker.database.mongodbObjectId(),
                email: faker.internet.email(),
                role: 'user',
            };

            const tokens = await tokenService.generateTokenPair(payload);

            await expect(tokenService.verifyRefreshToken(tokens.accessToken)).rejects.toThrow(
                /Invalid or expired refresh token/
            );
        });
    });

    describe('Token Refresh', () => {
        it('should refresh tokens correctly', async () => {
            const payload = {
                userId: faker.database.mongodbObjectId(),
                email: faker.internet.email(),
                role: 'user',
            };

            const initialTokens = await tokenService.generateTokenPair(payload);
            const newTokens = await tokenService.refreshTokens(initialTokens.refreshToken);

            expect(newTokens.accessToken).toBeDefined();
            expect(newTokens.refreshToken).toBeDefined();
            expect(newTokens.accessToken).not.toBe(initialTokens.accessToken);
            expect(newTokens.refreshToken).not.toBe(initialTokens.refreshToken);

            // Verify new tokens work
            const verified = await tokenService.verifyAccessToken(newTokens.accessToken);
            expect(verified.userId).toBe(payload.userId);

            // Old refresh token should be invalid
            await expect(tokenService.verifyRefreshToken(initialTokens.refreshToken)).rejects.toThrow();
        });

        it('should reject refresh with invalid token', async () => {
            await expect(tokenService.refreshTokens('invalid-token')).rejects.toThrow(
                /Invalid or expired refresh token/
            );
        });
    });

    describe('Token Blacklisting', () => {
        it('should blacklist and reject tokens', async () => {
            const payload = {
                userId: faker.database.mongodbObjectId(),
                email: faker.internet.email(),
                role: 'user',
            };

            const tokens = await tokenService.generateTokenPair(payload);

            // Token should work initially
            await expect(tokenService.verifyAccessToken(tokens.accessToken)).resolves.not.toThrow();

            // Blacklist token
            await tokenService.blacklistToken(tokens.accessToken);

            // Check if blacklisted
            const isBlacklisted = await tokenService.isTokenBlacklisted(tokens.accessToken);
            expect(isBlacklisted).toBe(true);

            // Token should now be rejected
            await expect(tokenService.verifyAccessToken(tokens.accessToken)).rejects.toThrow(/revoked/);
        });

        it('should handle malformed tokens in blacklist', async () => {
            await expect(tokenService.blacklistToken('malformed-token')).resolves.not.toThrow();

            const isBlacklisted = await tokenService.isTokenBlacklisted('malformed-token');
            expect(isBlacklisted).toBe(true);
        });
    });

    describe('User Token Management', () => {
        it('should revoke user refresh tokens', async () => {
            const userId = faker.database.mongodbObjectId();
            const payload = {
                userId,
                email: faker.internet.email(),
                role: 'user',
            };

            const tokens = await tokenService.generateTokenPair(payload);

            // Revoke refresh token
            await tokenService.revokeRefreshToken(userId);

            // Token should now be invalid
            await expect(tokenService.verifyRefreshToken(tokens.refreshToken)).rejects.toThrow();
        });

        it('should revoke all user tokens', async () => {
            const userId = faker.database.mongodbObjectId();
            const payload = {
                userId,
                email: faker.internet.email(),
                role: 'user',
            };

            const tokens = await tokenService.generateTokenPair(payload);

            // Revoke all tokens
            await tokenService.revokeAllUserTokens(userId);

            // Check revocation status
            const areRevoked = await tokenService.isUserTokensRevoked(userId);
            expect(areRevoked).toBe(true);

            // Refresh token should be invalid
            await expect(tokenService.verifyRefreshToken(tokens.refreshToken)).rejects.toThrow();
        });
    });

    describe('Token Information', () => {
        it('should provide token info for valid tokens', async () => {
            const payload = {
                userId: faker.database.mongodbObjectId(),
                email: faker.internet.email(),
                role: 'admin',
            };

            const tokens = await tokenService.generateTokenPair(payload);
            const tokenInfo = await tokenService.getTokenInfo(tokens.accessToken);

            expect(tokenInfo.isValid).toBe(true);
            expect(tokenInfo.header).toBeDefined();
            expect(tokenInfo.payload).toBeDefined();
            expect(tokenInfo.error).toBeUndefined();

            if (tokenInfo.payload) {
                expect(tokenInfo.payload.userId).toBe(payload.userId);
                expect(tokenInfo.payload.email).toBe(payload.email);
                expect(tokenInfo.payload.role).toBe(payload.role);
            }
        });

        it('should handle invalid token info requests', async () => {
            const tokenInfo = await tokenService.getTokenInfo('invalid-token');

            expect(tokenInfo.isValid).toBe(false);
            expect(tokenInfo.error).toBeDefined();
            expect(tokenInfo.header).toBeUndefined();
            expect(tokenInfo.payload).toBeUndefined();
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty strings gracefully', async () => {
            await expect(tokenService.verifyAccessToken('')).rejects.toThrow();

            await expect(tokenService.verifyRefreshToken('')).rejects.toThrow();
        });

        it('should handle concurrent operations', async () => {
            const payload = {
                userId: faker.database.mongodbObjectId(),
                email: faker.internet.email(),
                role: 'user',
            };

            // Generate multiple tokens concurrently
            const promises = Array.from({ length: 3 }, () => tokenService.generateTokenPair(payload));

            const results = await Promise.all(promises);

            // All should succeed and be unique
            for (let i = 0; i < results.length; i++) {
                expect(results[i].accessToken).toBeDefined();
                expect(results[i].refreshToken).toBeDefined();

                // Verify uniqueness
                for (let j = i + 1; j < results.length; j++) {
                    expect(results[i].accessToken).not.toBe(results[j].accessToken);
                    expect(results[i].refreshToken).not.toBe(results[j].refreshToken);
                }
            }
        });
    });

    describe('Service Management', () => {
        it('should handle disconnect gracefully', async () => {
            await expect(tokenService.disconnect()).resolves.not.toThrow();
        });

        it('should clear test data', async () => {
            if (tokenService.clearAllForTesting) {
                await expect(tokenService.clearAllForTesting()).resolves.not.toThrow();
            }
        });
    });
});
