// CRITICAL: Mock TokenService BEFORE any imports that might use it
jest.mock('../../services/TokenService', () => {
    const jwt = require('jsonwebtoken');
    
    // Create stateful mocks for testing
    const blacklistedTokens = new Set();
    const usedRefreshTokens = new Set();
    const revokedUserTokens = new Set();
    
    // Create a mock instance that matches the singleton pattern
    const mockTokenService = {
        verifyAccessToken: jest.fn().mockImplementation(async (token) => {
            console.log('=== TokenService.verifyAccessToken MOCK CALLED ===');
            console.log('Token received:', token ? token.substring(0, 20) + '...' : 'null/undefined');
            
            if (!token) {
                throw new Error('No token provided');
            }
            
            // Check if token is blacklisted
            if (blacklistedTokens.has(token)) {
                throw new Error('Token is blacklisted');
            }
            
            try {
                // Try to decode the real JWT token - WITHOUT ignoring expiration
                const secret = process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing_12345';
                const decoded = jwt.verify(token, secret);
                console.log('Mock decoded payload:', decoded);
                
                // Return the payload with real user info
                return {
                    userId: decoded.userId,
                    email: decoded.email,
                    role: decoded.role
                };
            } catch (error) {
                console.log('Mock decode error:', error.message);
                // Throw error for expired/invalid tokens
                throw new Error(error.message.includes('expired') ? 'Token expired' : 'Invalid token');
            }
        }),
        
        verifyRefreshToken: jest.fn().mockImplementation(async (token) => {
            console.log('=== TokenService.verifyRefreshToken MOCK CALLED ===');
            
            if (!token) {
                throw new Error('No refresh token provided');
            }
            
            // Check if token is blacklisted
            if (blacklistedTokens.has(token)) {
                throw new Error('Refresh token is blacklisted');
            }
            
            // Check if refresh token has been used (one-time use)
            if (usedRefreshTokens.has(token)) {
                throw new Error('Refresh token has already been used');
            }
            
            try {
                // Try to decode the real JWT token
                const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET, { ignoreExpiration: true });
                
                // Mark this refresh token as used
                usedRefreshTokens.add(token);
                
                return {
                    userId: decoded.userId,
                    email: decoded.email,
                    role: decoded.role
                };
            } catch (error) {
                throw new Error('Invalid refresh token format');
            }
        }),
        
        isUserTokensRevoked: jest.fn().mockImplementation(async (userId) => {
            console.log('=== TokenService.isUserTokensRevoked MOCK CALLED ===');
            return revokedUserTokens.has(userId);
        }),
        
        isTokenBlacklisted: jest.fn().mockImplementation(async (token) => {
            console.log('=== TokenService.isTokenBlacklisted MOCK CALLED ===');
            const isBlacklisted = blacklistedTokens.has(token);
            console.log('Token is blacklisted:', isBlacklisted);
            return isBlacklisted;
        }),
        
        blacklistToken: jest.fn().mockImplementation(async (token) => {
            console.log('=== TokenService.blacklistToken MOCK CALLED ===');
            blacklistedTokens.add(token);
            return true;
        }),
        
        revokeAllUserTokens: jest.fn().mockImplementation(async (userId) => {
            console.log('=== TokenService.revokeAllUserTokens MOCK CALLED ===');
            revokedUserTokens.add(userId);
            return true;
        }),
        
        generateTokenPair: jest.fn().mockImplementation(async (payload) => {
            // Add timestamp and random element to ensure unique tokens
            const tokenPayload = {
                ...payload,
                iat: Math.floor(Date.now() / 1000),
                nonce: Math.random().toString(36).substring(7)
            };
            const accessToken = jwt.sign(tokenPayload, 'test_jwt_secret_key_for_testing_12345', {
                expiresIn: '15m',
                issuer: 'vegan-guide-api',
                audience: 'vegan-guide-client'
            });
            const refreshToken = jwt.sign({...tokenPayload, type: 'refresh'}, 'test_refresh_secret_12345', {
                expiresIn: '7d',
                issuer: 'vegan-guide-api',
                audience: 'vegan-guide-client'
            });
            return { accessToken, refreshToken };
        }),
        
        generateTokens: jest.fn().mockImplementation(async (userId, email, role) => {
            const payload = {
                userId,
                email: email || 'test@example.com',
                role: role || 'user'
            };
            return mockTokenService.generateTokenPair(payload);
        }),
        
        refreshTokens: jest.fn().mockImplementation(async (refreshToken) => {
            console.log('=== TokenService.refreshTokens MOCK CALLED ===');
            
            // Use the verifyRefreshToken method from our mock
            const payload = await mockTokenService.verifyRefreshToken(refreshToken);
            
            // Generate new token pair
            return mockTokenService.generateTokenPair({
                userId: payload.userId,
                email: payload.email,
                role: payload.role,
            });
        }),
        
        revokeRefreshToken: jest.fn().mockImplementation(async (userId) => {
            console.log('=== TokenService.revokeRefreshToken MOCK CALLED ===');
            return true;
        })
    };
    
    return mockTokenService;
});

// Ensure UserService is NOT mocked for integration tests
jest.unmock('../../services/UserService');

// Ensure controllers are NOT mocked for integration tests
jest.unmock('../../controllers/userControllers');
jest.unmock('../../middleware/authMiddleware');

// Simple integration test setup - minimal mocks
import { faker } from '@faker-js/faker';
import { generateTestPassword } from '../utils/passwordGenerator';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_12345';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_12345';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.BCRYPT_SALT_ROUNDS = '10';

// Disable Redis for tests
process.env.REDIS_HOST = '';
process.env.REDIS_PORT = '';

// Email configuration for tests
process.env.EMAIL_USER = faker.internet.email();
process.env.EMAIL_PASS = generateTestPassword();
process.env.CLIENT_URL = 'http://localhost:3000'

// Increase timeout for integration tests
jest.setTimeout(30000);

console.log('Integration test setup complete');
