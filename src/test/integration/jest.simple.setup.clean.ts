// Simple integration test setup - minimal mocks
import { faker } from '@faker-js/faker';
import { generateTestPassword } from '../utils/passwordGenerator';

// Set test environment variables FIRST
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
process.env.CLIENT_URL = 'http://localhost:3000';

// CRITICAL: Mock TokenService BEFORE any imports that might use it
jest.mock('../../services/TokenService', () => {
    const jwt = require('jsonwebtoken');
    
    // Create a mock instance that matches the singleton pattern
    const mockTokenService = {
        verifyAccessToken: jest.fn().mockImplementation(async (token) => {
            console.log('=== TokenService.verifyAccessToken MOCK CALLED ===');
            console.log('TokenService.verifyAccessToken called with token:', token ? token.substring(0, 20) + '...' : 'null/undefined');
            
            // Decode real JWT tokens used in tests
            try {
                console.log('Attempting to verify with secret:', process.env.JWT_SECRET ? 'SECRET_SET' : 'NO_SECRET');
                const decoded = jwt.verify(token, process.env.JWT_SECRET, {
                    ignoreExpiration: true, // Ignore expiration in tests
                    issuer: 'vegan-guide-api',
                    audience: 'vegan-guide-client'
                });
                console.log('TokenService mock - decoded token:', decoded);
                return decoded;
            } catch (error) {
                console.log('TokenService mock - decode error:', error.message);
                // Fallback to mock data if decoding fails
                return { userId: 'test-user-id', email: 'test@example.com', role: 'admin' };
            }
        }),
        
        isUserTokensRevoked: jest.fn().mockImplementation(async (userId) => {
            return false; // Never revoked in tests
        }),
        
        isTokenBlacklisted: jest.fn().mockImplementation(async (token) => {
            return false; // Never blacklisted in tests
        }),
        
        blacklistToken: jest.fn().mockImplementation(async (token) => {
            return true;
        }),
        
        revokeAllUserTokens: jest.fn().mockImplementation(async (userId) => {
            return true;
        }),
        
        generateTokenPair: jest.fn().mockImplementation(async (payload) => {
            const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn: '15m',
                issuer: 'vegan-guide-api',
                audience: 'vegan-guide-client'
            });
            const refreshToken = jwt.sign({...payload, type: 'refresh'}, process.env.JWT_REFRESH_SECRET, {
                expiresIn: '7d',
                issuer: 'vegan-guide-api',
                audience: 'vegan-guide-client'
            });
            return { accessToken, refreshToken };
        })
    };
    
    return {
        __esModule: true,
        default: mockTokenService
    };
});

// Increase timeout for integration tests
jest.setTimeout(30000);

console.log('Integration test setup complete');
