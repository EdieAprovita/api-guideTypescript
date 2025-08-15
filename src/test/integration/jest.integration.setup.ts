// Integration test setup - NO MOCKS for real integration testing
import { faker } from '@faker-js/faker';
import { generateTestPassword } from '../utils/passwordGenerator';
import jwt from 'jsonwebtoken';

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

// Email configuration for tests (mock transporter will be used)
process.env.EMAIL_USER = faker.internet.email();
process.env.EMAIL_PASS = generateTestPassword();
process.env.CLIENT_URL = 'http://localhost:3000';

// Increase timeout for integration tests
vi.setConfig({ testTimeout: (30000);

// Clear any global mocks that might interfere with integration tests
vi.clearAllMocks();
vi.restoreAllMocks();

// Mock TokenService to avoid Redis issues
vi.mock('../../services/TokenService', () => {
    return {
        __esModule: true,
        default: {
            verifyAccessToken: vi.fn().mockImplementation(async (token: string) => {
                try {
                    const secret = process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing';
                    const payload = jwt.verify(token, secret, {
                        issuer: 'vegan-guide-api',
                        audience: 'vegan-guide-client'
                    });
                    return payload;
                } catch (error) {
                    throw new Error('Invalid or expired access token');
                }
            }),
            isUserTokensRevoked: vi.fn().mockResolvedValue(false),
            isTokenBlacklisted: vi.fn().mockResolvedValue(false),
            generateTokenPair: vi.fn().mockResolvedValue({
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token'
            })
        }
    };
});

// Mock auth middleware to use simplified authentication
vi.mock('../../middleware/authMiddleware', () => {
    const { User } = require('../../models/User');
    
    return {
        __esModule: true,
        protect: vi.fn().mockImplementation(async (req: any, res: any, next: any) => {
            try {
                let token: string | undefined;

                // Check for token in Authorization header (Bearer token)
                if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
                    token = req.headers.authorization.split(' ')[1];
                }

                if (!token) {
                    return res.status(401).json({
                        success: false,
                        message: 'Not authorized to access this route'
                    });
                }

                try {
                    const secret = process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing';
                    const payload = jwt.verify(token, secret, {
                        issuer: 'vegan-guide-api',
                        audience: 'vegan-guide-client'
                    }) as any;

                    const currentUser = await User.findById(payload.userId).select('-password');

                    if (!currentUser) {
                        return res.status(401).json({
                            success: false,
                            message: 'User not found'
                        });
                    }

                    req.user = currentUser;
                    next();
                } catch (error) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid or expired token'
                    });
                }
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Authentication error'
                });
            }
        }),
        admin: vi.fn().mockImplementation((req: any, res: any, next: any) => {
            if (!req.user || req.user.role !== 'admin') {
                return res.status(403).json({
                    errors: [{ message: 'Access denied. Admin required.' }]
                });
            }
            next();
        }),
        professional: vi.fn().mockImplementation((req: any, res: any, next: any) => {
            if (!req.user || req.user.role !== 'professional') {
                return res.status(403).json({
                    errors: [{ message: 'Access denied. Professional required.' }]
                });
            }
            next();
        }),
        requireAuth: vi.fn().mockImplementation((req: any, res: any, next: any) => {
            if (!req.user) {
                return res.status(401).json({
                    message: 'Unauthorized',
                    success: false,
                    error: 'User not authenticated',
                });
            }
            next();
        }),
        checkOwnership: vi.fn().mockImplementation((resourceField: string = 'userId') => {
            return (req: any, res: any, next: any) => {
                if (!req.user) {
                    return res.status(401).json({
                        message: 'Unauthorized',
                        success: false,
                        error: 'User not authenticated',
                    });
                }
                next();
            };
        }),
        logout: vi.fn().mockImplementation(async (req: any, res: any, next: any) => {
            next();
        }),
        refreshToken: vi.fn().mockImplementation(async (req: any, res: any) => {
            res.status(200).json({ message: 'Token refreshed' });
        }),
        revokeAllTokens: vi.fn().mockImplementation(async (req: any, res: any) => {
            res.status(200).json({ message: 'All tokens revoked' });
        })
    };
});

// Explicitly unmock ALL modules that might be mocked
vi.unmock('../../controllers/userControllers');
vi.unmock('../../services/UserService');
vi.unmock('../../services/ReviewService');
vi.unmock('../../services/RestaurantService');
vi.unmock('../../middleware/validation');
vi.unmock('../../middleware/security');
vi.unmock('../../models/User');
vi.unmock('../../models/Restaurant');
vi.unmock('../../models/Review');
vi.unmock('bcryptjs');
vi.unmock('jsonwebtoken');
vi.unmock('../../config/db');
vi.unmock('../../utils/logger');

// Clear all mocks to ensure real implementations are used
vi.clearAllMocks();
vi.resetModules();

// Ensure bcrypt is available for integration tests
const bcrypt = require('bcryptjs');
if (!bcrypt || !bcrypt.hash) {
    console.warn('bcrypt not properly loaded for integration tests');
}

// Enable console logs for integration tests to see errors
global.console = {
    ...console,
    log: console.log,
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
};
