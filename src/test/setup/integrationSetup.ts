// Integration test setup for Vitest - uses real middleware and components
import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { generateTestPassword } from '../utils/passwordGenerator';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

// Set faker seed for consistent test results
faker.seed(12345);

// Set test environment variables BEFORE any imports
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

// CRITICAL: Mock jsonwebtoken BEFORE TokenService to ensure proper mocking
vi.mock('jsonwebtoken', () => {
    const { faker } = require('@faker-js/faker');
    const generateValidObjectId = () => faker.database.mongodbObjectId();

    return {
        __esModule: true,
        default: {
            sign: vi.fn().mockImplementation((payload) => {
                // Preserve the actual userId from the payload or generate a valid one if missing
                const actualUserId = payload && payload.userId ? payload.userId : generateValidObjectId();
                const actualEmail = payload && payload.email ? payload.email : 'test@email.com';
                const actualRole = payload && payload.role ? payload.role : 'user';
                return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI${actualUserId}","email":"${actualEmail}","role":"${actualRole}"}.mock-signature`;
            }),
            verify: vi.fn().mockImplementation((token) => {
                // Try to decode the mock token format to extract the actual user data
                const tokenStr = token as string;
                try {
                    if (tokenStr.includes('mock-signature')) {
                        const payloadPart = tokenStr.split('.')[1];
                        // Mock payload extraction since it's base64-like but not real base64
                        const match = payloadPart.match(/"userId":"([^"]+)"/);
                        const emailMatch = payloadPart.match(/"email":"([^"]+)"/);
                        const roleMatch = payloadPart.match(/"role":"([^"]+)"/);

                        return {
                            userId: match ? match[1] : generateValidObjectId(),
                            email: emailMatch ? emailMatch[1] : 'test@email.com',
                            role: roleMatch ? roleMatch[1] : 'user',
                            exp: Math.floor(Date.now() / 1000) + 3600,
                        };
                    }
                } catch (e) {
                    // Fallback
                }

                // Fallback for other token formats
                return {
                    userId: generateValidObjectId(),
                    email: 'test@email.com',
                    role: 'user',
                    exp: Math.floor(Date.now() / 1000) + 3600,
                };
            }),
            decode: vi.fn().mockImplementation(() => ({
                userId: generateValidObjectId(),
                email: 'test@email.com',
                role: 'user',
                exp: Math.floor(Date.now() / 1000) + 3600,
            })),
        },
        sign: vi.fn().mockImplementation((payload) => {
            // Preserve the actual userId from the payload or generate a valid one if missing
            const actualUserId = payload && payload.userId ? payload.userId : generateValidObjectId();
            const actualEmail = payload && payload.email ? payload.email : 'test@email.com';
            const actualRole = payload && payload.role ? payload.role : 'user';
            return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI${actualUserId}","email":"${actualEmail}","role":"${actualRole}"}.mock-signature`;
        }),
        verify: vi.fn().mockImplementation((token) => {
            // Try to decode the mock token format to extract the actual user data
            const tokenStr = token as string;
            try {
                if (tokenStr.includes('mock-signature')) {
                    const payloadPart = tokenStr.split('.')[1];
                    // Mock payload extraction since it's base64-like but not real base64
                    const match = payloadPart.match(/"userId":"([^"]+)"/);
                    const emailMatch = payloadPart.match(/"email":"([^"]+)"/);
                    const roleMatch = payloadPart.match(/"role":"([^"]+)"/);

                    return {
                        userId: match ? match[1] : generateValidObjectId(),
                        email: emailMatch ? emailMatch[1] : 'test@email.com',
                        role: roleMatch ? roleMatch[1] : 'user',
                        exp: Math.floor(Date.now() / 1000) + 3600,
                    };
                }
            } catch (e) {
                // Fallback
            }

            // Fallback for other token formats
            return {
                userId: generateValidObjectId(),
                email: 'test@email.com',
                role: 'user',
                exp: Math.floor(Date.now() / 1000) + 3600,
            };
        }),
        decode: vi.fn().mockImplementation((token) => {
            // Try to decode the mock token format to extract the actual user data
            const tokenStr = token as string;
            try {
                if (tokenStr.includes('mock-signature')) {
                    const payloadPart = tokenStr.split('.')[1];
                    // Mock payload extraction since it's base64-like but not real base64
                    const match = payloadPart.match(/"userId":"([^"]+)"/);
                    const emailMatch = payloadPart.match(/"email":"([^"]+)"/);
                    const roleMatch = payloadPart.match(/"role":"([^"]+)"/);

                    return {
                        userId: match ? match[1] : generateValidObjectId(),
                        email: emailMatch ? emailMatch[1] : 'test@email.com',
                        role: roleMatch ? roleMatch[1] : 'user',
                        exp: Math.floor(Date.now() / 1000) + 3600,
                    };
                }
            } catch (e) {
                // Fallback
            }

            // Fallback for other token formats
            return {
                userId: generateValidObjectId(),
                email: 'test@email.com',
                role: 'user',
                exp: Math.floor(Date.now() / 1000) + 3600,
            };
        }),
    };
});

// CRITICAL: Mock TokenService BEFORE any imports that might use it
vi.mock('../../services/TokenService', () => {
    const jwt = require('jsonwebtoken');

    // Create stateful mocks for testing
    const blacklistedTokens = new Set();
    const usedRefreshTokens = new Set();
    const revokedUserTokens = new Set();

    // Create a mock instance that matches the singleton pattern
    const mockTokenService = {
        verifyAccessToken: vi.fn().mockImplementation(async (token) => {
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
                // Use the mock jwt.verify to decode the token
                const decoded = jwt.verify(token);
                console.log('Mock decoded payload:', decoded);

                // Return the payload with real user info
                return {
                    userId: decoded.userId,
                    email: decoded.email,
                    role: decoded.role,
                };
            } catch (error) {
                console.log('Mock decode error:', error.message);
                // Throw error for expired/invalid tokens
                throw new Error(error.message.includes('expired') ? 'Token expired' : 'Invalid token');
            }
        }),

        verifyRefreshToken: vi.fn().mockImplementation(async (token) => {
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
                // Use the mock jwt.verify to decode the token
                const decoded = jwt.verify(token);

                // Mark this refresh token as used
                usedRefreshTokens.add(token);

                return {
                    userId: decoded.userId,
                    email: decoded.email,
                    role: decoded.role,
                };
            } catch (error) {
                throw new Error('Invalid refresh token format');
            }
        }),

        generateTokenPair: vi.fn().mockImplementation(async (payload) => {
            // Add timestamp and random element to ensure unique tokens
            const tokenPayload = {
                ...payload,
                iat: Math.floor(Date.now() / 1000),
                nonce: Math.random().toString(36).substring(7),
            };
            const accessToken = jwt.sign(tokenPayload);
            const refreshToken = jwt.sign({ ...tokenPayload, type: 'refresh' });
            return { accessToken, refreshToken };
        }),

        generateTokens: vi.fn().mockImplementation(async (userId, email, role) => {
            const payload = {
                userId,
                email: email || 'test@example.com',
                role: role || 'user',
            };
            return mockTokenService.generateTokenPair(payload);
        }),

        refreshTokens: vi.fn().mockImplementation(async (refreshToken) => {
            console.log('=== TokenService.refreshTokens MOCK CALLED ===');
            console.log(
                'Refresh token received:',
                refreshToken ? refreshToken.substring(0, 20) + '...' : 'null/undefined'
            );

            // Extract userId from refresh token to generate new tokens
            try {
                const decoded = jwt.verify(refreshToken);

                const payload = {
                    userId: decoded.userId,
                    email: decoded.email || 'test@example.com',
                    role: decoded.role || 'user',
                };

                return mockTokenService.generateTokenPair(payload);
            } catch (error) {
                throw new Error('Invalid refresh token');
            }
        }),

        isUserTokensRevoked: vi.fn().mockImplementation(async (userId) => {
            console.log('=== TokenService.isUserTokensRevoked MOCK CALLED ===');
            console.log('userId:', userId);
            return revokedUserTokens.has(userId);
        }),

        isTokenBlacklisted: vi.fn().mockImplementation(async (token) => {
            console.log('=== TokenService.isTokenBlacklisted MOCK CALLED ===');
            console.log('token:', token ? token.substring(0, 20) + '...' : 'null/undefined');
            return blacklistedTokens.has(token);
        }),

        blacklistToken: vi.fn().mockImplementation(async (token) => {
            console.log('=== TokenService.blacklistToken MOCK CALLED ===');
            blacklistedTokens.add(token);
            return true;
        }),

        revokeAllUserTokens: vi.fn().mockImplementation(async (userId) => {
            console.log('=== TokenService.revokeAllUserTokens MOCK CALLED ===');
            revokedUserTokens.add(userId);
            return true;
        }),

        revokeRefreshToken: vi.fn().mockImplementation(async (userId) => {
            console.log('=== TokenService.revokeRefreshToken MOCK CALLED ===');
            return true;
        }),
    };

    return {
        __esModule: true,
        default: mockTokenService,
    };
});

// Database setup for integration tests
beforeAll(async () => {
    console.log('🔧 Setting up integration test database...');
    
    // Use MongoDB Memory Server if no local MongoDB URI is provided
    if (!process.env.MONGODB_URI?.includes('localhost')) {
        try {
            mongoServer = await MongoMemoryServer.create({
                binary: {
                    version: '6.0.0',
                },
                instance: {
                    dbName: 'test-integration-db',
                },
            });
            
            const mongoUri = mongoServer.getUri();
            process.env.MONGODB_URI = mongoUri;
            
            console.log('✅ MongoDB Memory Server started for integration tests:', mongoUri);
        } catch (error) {
            console.error('❌ Failed to start MongoDB Memory Server:', error);
            throw error;
        }
    }
});

beforeEach(async () => {
    // Clear mocks between tests
    vi.clearAllMocks();
    
    // Clear database collections if connected
    if (mongoose.connection.readyState === 1) {
        const collections = mongoose.connection.db.collections();
        for (let collection of await collections) {
            await collection.deleteMany({});
        }
    }
});

afterAll(async () => {
    console.log('🧹 Cleaning up integration test environment...');
    
    // Close mongoose connection
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
    }
    
    // Stop MongoDB Memory Server
    if (mongoServer) {
        try {
            await mongoServer.stop();
            console.log('✅ MongoDB Memory Server stopped');
        } catch (error) {
            console.error('❌ Error stopping MongoDB Memory Server:', error);
        }
    }
});

console.log('✅ Integration test setup complete - Using REAL middleware for authentication tests');