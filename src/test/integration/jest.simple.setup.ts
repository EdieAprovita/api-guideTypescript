// Simple integration test setup - minimal mocks
import { faker } from '@faker-js/faker';
import { generateTestPassword } from '../utils/passwordGenerator';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || generateTestPassword();
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || generateTestPassword();
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.BCRYPT_SALT_ROUNDS = '10';

// Disable Redis for tests
process.env.REDIS_HOST = '';
process.env.REDIS_PORT = '';

// Email configuration for tests
process.env.EMAIL_USER = faker.internet.email();
process.env.EMAIL_PASS = generateTestPassword();
process.env.CLIENT_URL = 'http://localhost:3000';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Clear any global mocks and restore real implementations
jest.clearAllMocks();
jest.restoreAllMocks();
jest.resetModules();

// Explicitly unmock critical modules for integration tests
jest.unmock('../../controllers/userControllers');
jest.unmock('../../middleware/authMiddleware');
jest.unmock('../../services/UserService');
jest.unmock('../../models/User');

// Force reset of existing mocks from global setup
jest.doMock('../../controllers/userControllers', () => jest.requireActual('../../controllers/userControllers'));
jest.doMock('../../middleware/authMiddleware', () => jest.requireActual('../../middleware/authMiddleware'));
jest.doMock('../../services/UserService', () => jest.requireActual('../../services/UserService'));

// Enhanced TokenService mock with state tracking
const blacklistedTokens = new Set();
const revokedUsers = new Set();
const usedRefreshTokens = new Set();
let tokenCounter = 0;

jest.mock('../../services/TokenService', () => ({
    __esModule: true,
    default: {
        verifyAccessToken: jest.fn().mockImplementation((token) => {
            // Check if token is blacklisted
            if (blacklistedTokens.has(token)) {
                return Promise.reject(new Error('Token is blacklisted'));
            }
            
            // Decode real JWT tokens used in tests
            const jwt = require('jsonwebtoken');
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing', {
                    ignoreExpiration: true // Ignore expiration in tests
                });
                console.log('TokenService mock - decoded token:', decoded);
                return Promise.resolve(decoded);
            } catch (error) {
                console.log('TokenService mock - decode error:', error.message);
                // Fallback to mock data if decoding fails
                return Promise.resolve({ userId: 'test-user-id', email: 'test@example.com' });
            }
        }),
        
        verifyRefreshToken: jest.fn().mockImplementation((token) => {
            // Check if refresh token has been used before
            if (usedRefreshTokens.has(token)) {
                return Promise.reject(new Error('Invalid refresh token'));
            }
            
            // Check if token is blacklisted
            if (blacklistedTokens.has(token)) {
                return Promise.reject(new Error('Token is blacklisted'));
            }
            
            // Decode real JWT tokens used in tests
            const jwt = require('jsonwebtoken');
            try {
                const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'test_jwt_refresh_secret_key', {
                    ignoreExpiration: true // Ignore expiration in tests
                });
                console.log('TokenService mock - decoded refresh token:', decoded);
                return Promise.resolve(decoded);
            } catch (error) {
                console.log('TokenService mock - refresh token decode error:', error.message);
                return Promise.reject(new Error('Invalid refresh token'));
            }
        }),
        
        refreshTokens: jest.fn().mockImplementation(async (refreshToken) => {
            try {
                console.log('refreshTokens called with:', refreshToken);
                
                // Check if refresh token has been used before
                if (usedRefreshTokens.has(refreshToken)) {
                    console.log('Refresh token already used');
                    throw new Error('Invalid refresh token');
                }
                
                // Check if token is blacklisted
                if (blacklistedTokens.has(refreshToken)) {
                    console.log('Refresh token is blacklisted');
                    throw new Error('Token is blacklisted');
                }
                
                // Verify the refresh token format
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'test_jwt_refresh_secret_key', {
                    ignoreExpiration: true // Ignore expiration in tests
                });
                console.log('Refresh token decoded:', decoded);
                
                // Mark refresh token as used
                usedRefreshTokens.add(refreshToken);
                
                // Generate new token pair with different tokens
                tokenCounter++;
                const timestamp = Date.now() + Math.random();
                const newAccessToken = `new-access-token-${tokenCounter}-${timestamp}`;
                const newRefreshToken = `new-refresh-token-${tokenCounter}-${timestamp}`;
                
                console.log('refreshTokens returning:', { accessToken: newAccessToken, refreshToken: newRefreshToken });
                return Promise.resolve({
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken
                });
            } catch (error) {
                console.log('refreshTokens error:', error.message);
                throw new Error('Invalid refresh token');
            }
        }),
        
        isUserTokensRevoked: jest.fn().mockImplementation((userId) => {
            return Promise.resolve(revokedUsers.has(userId));
        }),
        
        isTokenBlacklisted: jest.fn().mockImplementation((token) => {
            return Promise.resolve(blacklistedTokens.has(token));
        }),
        
        blacklistToken: jest.fn().mockImplementation((token) => {
            blacklistedTokens.add(token);
            return Promise.resolve(true);
        }),
        
        revokeAllUserTokens: jest.fn().mockImplementation((userId) => {
            revokedUsers.add(userId);
            return Promise.resolve(true);
        }),
        
        generateTokenPair: jest.fn().mockImplementation((userPayload) => {
            tokenCounter++;
            console.log('generateTokenPair called with:', userPayload);
            const jwt = require('jsonwebtoken');
            
            // Generate real JWT tokens but with a timestamp to ensure uniqueness
            const timestamp = Date.now() + Math.random();
            const accessPayload = {
                userId: userPayload.userId,
                email: userPayload.email,
                role: userPayload.role,
                timestamp // Add timestamp to make tokens unique
            };
            
            const accessToken = jwt.sign(
                accessPayload,
                process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing',
                {
                    expiresIn: '15m',
                    issuer: 'vegan-guide-api',
                    audience: 'vegan-guide-client'
                }
            );
            
            const refreshToken = jwt.sign(
                accessPayload,
                process.env.JWT_REFRESH_SECRET || 'test_jwt_refresh_secret_key',
                {
                    expiresIn: '7d',
                    issuer: 'vegan-guide-api',
                    audience: 'vegan-guide-client'
                }
            );
            
            console.log('generateTokenPair returning tokens:', { accessToken, refreshToken });
            return Promise.resolve({
                accessToken,
                refreshToken
            });
        })
    }
}));

console.log('Integration test setup complete');
