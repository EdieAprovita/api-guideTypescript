/**
 * Simplified Unit Test Setup
 * Fast and focused setup for unit tests only
 */

import { vi, beforeAll, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// ============================================================================
// ENVIRONMENT SETUP
// ============================================================================

beforeAll(() => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test_secret_12345';
    process.env.JWT_REFRESH_SECRET = 'test_refresh_12345';
    process.env.BCRYPT_SALT_ROUNDS = '4';

    // Prevent external connections
    process.env.REDIS_HOST = 'mock-redis';
    process.env.REDIS_PORT = '9999';
    process.env.REDIS_PASSWORD = 'mock-password';
    process.env.MONGODB_URI = 'mock-mongodb';
});

// ============================================================================
// CORE MOCKS - Only essential mocks
// ============================================================================

beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Mock mongoose completely to avoid schema issues
    vi.mock('mongoose', () => ({
        default: {
            connect: vi.fn().mockResolvedValue(undefined),
            disconnect: vi.fn().mockResolvedValue(undefined),
            connection: {
                readyState: 0,
                db: null,
            },
            model: vi.fn(),
            Schema: vi.fn(),
            Types: {
                ObjectId: vi.fn().mockReturnValue('mock-object-id'),
            },
        },
        Schema: vi.fn(),
        model: vi.fn(),
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        Types: {
            ObjectId: vi.fn().mockReturnValue('mock-object-id'),
        },
    }));

    // Mock external dependencies that cause real connections
    vi.mock('ioredis', () => ({
        default: vi.fn().mockImplementation(() => ({
            connect: vi.fn().mockResolvedValue(undefined),
            disconnect: vi.fn().mockResolvedValue(undefined),
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn().mockResolvedValue('OK'),
            del: vi.fn().mockResolvedValue(1),
            exists: vi.fn().mockResolvedValue(0),
            expire: vi.fn().mockResolvedValue(1),
            on: vi.fn(),
            off: vi.fn(),
        })),
    }));

    // Mock logger to avoid console noise
    vi.mock('../../utils/logger', () => ({
        default: {
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn(),
        },
    }));

    // Mock bcryptjs for consistent hashing
    vi.mock('bcryptjs', () => ({
        hash: vi.fn().mockResolvedValue('hashed_password'),
        compare: vi.fn().mockResolvedValue(true),
        genSalt: vi.fn().mockResolvedValue('salt'),
    }));

    // Mock jsonwebtoken for consistent tokens
    vi.mock('jsonwebtoken', () => ({
        sign: vi.fn().mockReturnValue('mock.jwt.token'),
        verify: vi.fn().mockReturnValue({ userId: 'test-user-id' }),
        decode: vi.fn().mockReturnValue({ userId: 'test-user-id' }),
    }));

    // Mock nodemailer to avoid real email sending
    vi.mock('nodemailer', () => ({
        createTransport: vi.fn().mockReturnValue({
            sendMail: vi.fn().mockResolvedValue({ messageId: 'mock-message-id' }),
            verify: vi.fn().mockResolvedValue(true),
        }),
    }));

    // Mock Google Maps API
    vi.mock('@googlemaps/google-maps-services-js', () => ({
        __esModule: true,
        default: {
            Client: vi.fn().mockImplementation(() => ({
                geocode: vi.fn().mockResolvedValue({
                    data: {
                        results: [
                            {
                                geometry: {
                                    location: { lat: 40.7128, lng: -74.006 },
                                },
                            },
                        ],
                    },
                }),
            })),
        },
        Client: vi.fn().mockImplementation(() => ({
            geocode: vi.fn().mockResolvedValue({
                data: {
                    results: [
                        {
                            geometry: {
                                location: { lat: 40.7128, lng: -74.006 },
                            },
                        },
                    ],
                },
            }),
        })),
    }));

    // Mock all models to avoid Mongoose schema issues
    vi.mock('../../models/User', () => ({
        default: vi.fn(),
    }));

    vi.mock('../../models/Business', () => ({
        default: vi.fn(),
    }));

    vi.mock('../../models/Review', () => ({
        default: vi.fn(),
    }));

    vi.mock('../../models/Post', () => ({
        default: vi.fn(),
    }));

    vi.mock('../../models/Recipe', () => ({
        default: vi.fn(),
    }));

    vi.mock('../../models/Restaurant', () => ({
        default: vi.fn(),
    }));

    vi.mock('../../models/Doctor', () => ({
        default: vi.fn(),
    }));

    vi.mock('../../models/Market', () => ({
        default: vi.fn(),
    }));

    vi.mock('../../models/Sanctuary', () => ({
        default: vi.fn(),
    }));

    vi.mock('../../models/Profession', () => ({
        default: vi.fn(),
    }));

    vi.mock('../../models/ProfessionProfile', () => ({
        default: vi.fn(),
    }));

    // Mock services that cause issues
    vi.mock('../../services/CacheService', () => ({
        default: vi.fn().mockImplementation(() => ({
            initializeRedis: vi.fn(),
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn().mockResolvedValue('OK'),
            del: vi.fn().mockResolvedValue(1),
            exists: vi.fn().mockResolvedValue(0),
            expire: vi.fn().mockResolvedValue(1),
        })),
    }));

    vi.mock('../../services/BaseService', () => ({
        default: vi.fn().mockImplementation(() => ({
            findAll: vi.fn().mockResolvedValue([]),
            findById: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({}),
            update: vi.fn().mockResolvedValue({}),
            delete: vi.fn().mockResolvedValue({}),
        })),
    }));
});

// ============================================================================
// TYPES
// ============================================================================

interface MockRequest {
    body: Record<string, unknown>;
    params: Record<string, string>;
    query: Record<string, string>;
    headers: Record<string, string>;
    user?: Record<string, unknown> | null;
}

interface MockResponse {
    status: (code: number) => MockResponse;
    json: (data: unknown) => MockResponse;
    send: (data: unknown) => MockResponse;
    cookie: (name: string, value: string) => MockResponse;
    clearCookie: (name: string) => MockResponse;
    redirect: (url: string) => MockResponse;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const generateMockId = (): string => '507f1f77bcf86cd799439011';
export const generateMockEmail = (): string => 'test@example.com';
export const generateMockPassword = (): string => 'TestPassword123!';

export const mockRequest = (overrides: Partial<MockRequest> = {}): MockRequest => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides,
});

export const mockResponse = (): MockResponse => {
    const res: MockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
        cookie: vi.fn().mockReturnThis(),
        clearCookie: vi.fn().mockReturnThis(),
        redirect: vi.fn().mockReturnThis(),
    };
    return res;
};

export const mockNext = vi.fn() as NextFunction;

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

interface MockUser {
    _id: string;
    userId: string;
    username: string;
    email: string;
    password: string;
    role: string;
    isAdmin: boolean;
    isActive: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface MockBusiness {
    _id: string;
    name: string;
    description: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    category: string;
    isActive: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface MockReview {
    _id: string;
    refId: string;
    refModel: string;
    author: string;
    title: string;
    content: string;
    rating: number;
    isActive: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
    _id: generateMockId(),
    userId: generateMockId(),
    username: 'testuser',
    email: generateMockEmail(),
    password: generateMockPassword(),
    role: 'user',
    isAdmin: false,
    isActive: true,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

export const createMockBusiness = (overrides: Partial<MockBusiness> = {}): MockBusiness => ({
    _id: generateMockId(),
    name: 'Test Business',
    description: 'Test Description',
    address: 'Test Address',
    phone: '+1234567890',
    email: generateMockEmail(),
    website: 'https://test.com',
    category: 'restaurant',
    isActive: true,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

export const createMockReview = (overrides: Partial<MockReview> = {}): MockReview => ({
    _id: generateMockId(),
    refId: generateMockId(),
    refModel: 'Business',
    author: generateMockId(),
    title: 'Test Review',
    content: 'Test Review Content',
    rating: 5,
    isActive: true,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

// ============================================================================
// ERROR HELPERS
// ============================================================================

export class MockHttpError extends Error {
    statusCode: number;
    errors?: Array<{ message: string }>;

    constructor(message: string, statusCode: number = 500, errors?: Array<{ message: string }>) {
        super(message);
        this.name = 'HttpError';
        this.statusCode = statusCode;
        this.errors = errors;
    }
}

export const createMockError = (message: string, statusCode: number = 500): MockHttpError =>
    new MockHttpError(message, statusCode);
