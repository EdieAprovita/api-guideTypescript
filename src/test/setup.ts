import { vi } from 'vitest';
// Global test setup - Centralized and optimized

import { faker } from '@faker-js/faker';
import { generateTestPassword } from './utils/passwordGenerator';
import { authMiddlewareMocks, validationMocks, securityMocks, userControllerMocks } from './__mocks__/middleware';
import { serviceMocks, modelMocks } from './__mocks__/services';
import { dbConfigMocks } from './__mocks__/database';

// Mock environment variables with faker-generated values
process.env.NODE_ENV = 'test'; // Cambiar a 'test' para mejor rendimiento
process.env.JWT_SECRET = generateTestPassword();
process.env.BCRYPT_SALT_ROUNDS = '10';

// === CRITICAL: Mocks must be defined BEFORE any imports that use them ===

// Mock database connection first - prevents connection attempts
vi.mock('../config/db', () => dbConfigMocks);

// Mock auth middleware - CRITICAL for authRoutes.ts
vi.mock('../middleware/authMiddleware', () => ({
    __esModule: true,
    ...authMiddlewareMocks,
}));

// Mock validation middleware
vi.mock('../middleware/validation', () => ({
    __esModule: true,
    ...validationMocks,
}));

// Mock security middleware
vi.mock('../middleware/security', () => ({
    __esModule: true,
    ...securityMocks,
}));

// Mock user controllers (used in authRoutes)
vi.mock('../controllers/userControllers', () => ({
    __esModule: true,
    ...userControllerMocks,
}));

// Mock TokenService to prevent Redis connection issues
vi.mock('../services/TokenService', () => ({
    __esModule: true,
    default: serviceMocks.tokenService,
}));

// Mock User model
vi.mock('../models/User', () => ({
    __esModule: true,
    User: modelMocks.User,
    default: modelMocks.User,
}));

// Mock external libraries
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
                            exp: Math.floor(Date.now() / 1000) + 3600
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
                    exp: Math.floor(Date.now() / 1000) + 3600
                };
            }),
            decode: vi.fn().mockImplementation(() => ({ 
                userId: generateValidObjectId(), 
                email: 'test@email.com', 
                role: 'user',
                exp: Math.floor(Date.now() / 1000) + 3600 
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
                        exp: Math.floor(Date.now() / 1000) + 3600
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
                exp: Math.floor(Date.now() / 1000) + 3600
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
                        exp: Math.floor(Date.now() / 1000) + 3600
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
                exp: Math.floor(Date.now() / 1000) + 3600
            };
        }),
    };
});

vi.mock('bcryptjs', () => ({
    __esModule: true,
    default: {
        hash: vi.fn().mockResolvedValue('hashed_password'),
        compare: vi.fn().mockResolvedValue(true),
        genSalt: vi.fn().mockResolvedValue('salt'),
    },
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn().mockResolvedValue(true),
    genSalt: vi.fn().mockResolvedValue('salt'),
}));

// Mock logger to prevent file system operations
vi.mock('../utils/logger', () => ({
    __esModule: true,
    default: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

// Global test utilities - Suppress console output in tests
global.console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: console.warn, // Keep warnings visible
    error: console.error, // Keep errors visible
};

// Setup global test hooks
beforeEach(() => {
    // Only clear mock calls, not the mock implementations
    vi.clearAllMocks();
});

afterEach(() => {
    // Clean up any test-specific changes
    vi.restoreAllMocks();
});
