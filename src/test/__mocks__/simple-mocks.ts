/**
 * Simple Mocks - Following Vitest Best Practices
 * No 'any' types - Fully typed mocks
 */

import { vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface MockUser {
    _id: string;
    email: string;
    username: string;
    role: string;
    isAdmin: boolean;
    isActive: boolean;
    isDeleted: boolean;
    photo: string;
}

interface MockTokenPair {
    accessToken: string;
    refreshToken: string;
}

interface MockBusiness {
    _id: string;
    namePlace: string;
    author: string;
    typeBusiness?: string;
}

interface MockRestaurant {
    _id: string;
    restaurantName: string;
    author: string;
    typePlace?: string;
}

interface MockCacheStats {
    hitRatio: number;
    memoryUsage: string;
    cacheSize: number;
    totalRequests: number;
    uptime: number;
}

interface MockAlertConfig {
    enabled: boolean;
    checkIntervalSeconds: number;
    thresholds: {
        minHitRatio: number;
        maxMemoryUsage: string;
        maxResponseTime: number;
        minCacheSize: number;
    };
}

// ============================================================================
// SIMPLE SERVICE MOCKS
// ============================================================================

export const mockTokenService = {
    generateTokens: vi.fn<[string, string?, string?], Promise<MockTokenPair>>().mockResolvedValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
    }),

    verifyAccessToken: vi.fn<[string], Promise<{ userId: string; email: string; role: string }>>().mockResolvedValue({
        userId: 'mock-user-id',
        email: 'test@example.com',
        role: 'user',
    }),

    verifyRefreshToken: vi
        .fn<[string], Promise<{ userId: string; email: string; role: string; type: string }>>()
        .mockResolvedValue({
            userId: 'mock-user-id',
            email: 'test@example.com',
            role: 'user',
            type: 'refresh',
        }),

    refreshTokens: vi.fn<[string], Promise<MockTokenPair>>().mockResolvedValue({
        accessToken: 'new-mock-access-token',
        refreshToken: 'new-mock-refresh-token',
    }),

    blacklistToken: vi.fn<[string], Promise<void>>().mockResolvedValue(undefined),
    disconnect: vi.fn<[], Promise<void>>().mockResolvedValue(undefined),
    clearAllForTesting: vi.fn<[], Promise<void>>().mockResolvedValue(undefined),
};

export const mockUserService = {
    registerUser: vi.fn<[Record<string, unknown>], Promise<{ success: boolean; user: MockUser }>>().mockResolvedValue({
        success: true,
        user: {
            _id: 'mock-user-id',
            email: 'test@example.com',
            username: 'testuser',
            role: 'user',
            isAdmin: false,
            isActive: true,
            isDeleted: false,
            photo: 'default.png',
        },
    }),

    loginUser: vi
        .fn<[Record<string, unknown>], Promise<{ success: boolean; user: MockUser; tokens: MockTokenPair }>>()
        .mockResolvedValue({
            success: true,
            user: {
                _id: 'mock-user-id',
                email: 'test@example.com',
                username: 'testuser',
                role: 'user',
                isAdmin: false,
                isActive: true,
                isDeleted: false,
                photo: 'default.png',
            },
            tokens: {
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
            },
        }),

    getUserById: vi.fn<[string], Promise<MockUser | null>>().mockResolvedValue({
        _id: 'mock-user-id',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user',
        isAdmin: false,
        isActive: true,
        isDeleted: false,
        photo: 'default.png',
    }),
};

export const mockBusinessService = {
    getAll: vi.fn<[], Promise<MockBusiness[]>>().mockResolvedValue([
        { _id: '1', namePlace: 'Test Business 1', author: 'user1' },
        { _id: '2', namePlace: 'Test Business 2', author: 'user2' },
    ]),

    findById: vi.fn<[string], Promise<MockBusiness>>().mockResolvedValue({
        _id: 'mock-business-id',
        namePlace: 'Mock Business',
        author: 'mock-user-id',
    }),

    create: vi.fn<[Partial<MockBusiness>], Promise<MockBusiness>>().mockResolvedValue({
        _id: 'new-business-id',
        namePlace: 'New Business',
        author: 'mock-user-id',
    }),

    updateById: vi.fn<[string, Partial<MockBusiness>], Promise<MockBusiness>>().mockResolvedValue({
        _id: 'mock-business-id',
        namePlace: 'Updated Business',
        author: 'mock-user-id',
    }),

    deleteById: vi.fn<[string], Promise<void>>().mockResolvedValue(undefined),
};

export const mockCacheService = {
    get: vi.fn<[string], Promise<unknown>>().mockResolvedValue(null),
    set: vi.fn<[string, unknown, string?, Record<string, unknown>?], Promise<void>>().mockResolvedValue(undefined),
    invalidate: vi.fn<[string], Promise<void>>().mockResolvedValue(undefined),
    invalidatePattern: vi.fn<[string], Promise<void>>().mockResolvedValue(undefined),
    invalidateByTag: vi.fn<[string], Promise<void>>().mockResolvedValue(undefined),

    getStats: vi.fn<[], Promise<MockCacheStats>>().mockResolvedValue({
        hitRatio: 85,
        memoryUsage: '25M',
        cacheSize: 50,
        totalRequests: 1000,
        uptime: 3600,
    }),

    flush: vi.fn<[], Promise<void>>().mockResolvedValue(undefined),
    disconnect: vi.fn<[], Promise<void>>().mockResolvedValue(undefined),
};

export const mockCacheAlertService = {
    startMonitoring: vi.fn<[], void>(),
    stopMonitoring: vi.fn<[], void>(),

    getConfig: vi.fn<[], MockAlertConfig>().mockReturnValue({
        enabled: true,
        checkIntervalSeconds: 60,
        thresholds: {
            minHitRatio: 70,
            maxMemoryUsage: '50M',
            maxResponseTime: 100,
            minCacheSize: 10,
        },
    }),

    getMonitoringStatus: vi.fn<[], Record<string, unknown>>().mockReturnValue({
        enabled: true,
        running: false,
        lastCheck: new Date(),
        activeAlerts: 0,
        checkInterval: 60,
    }),

    getActiveAlerts: vi.fn<[], unknown[]>().mockReturnValue([]),
    getAllAlerts: vi.fn<[], unknown[]>().mockReturnValue([]),
    updateConfig: vi.fn<[Partial<MockAlertConfig>], void>(),
};

export const mockLogger = {
    info: vi.fn<[string, ...unknown[]], void>(),
    error: vi.fn<[string, ...unknown[]], void>(),
    warn: vi.fn<[string, ...unknown[]], void>(),
    debug: vi.fn<[string, ...unknown[]], void>(),
};

// ============================================================================
// MONGOOSE MODEL MOCKS
// ============================================================================

interface MockMongooseDocument {
    _id: string;
    toObject: () => Record<string, unknown>;
}

export const createMockModel = (modelName: string) => ({
    create: vi.fn<[Record<string, unknown>], Promise<MockMongooseDocument>>().mockResolvedValue({
        _id: `mock-${modelName.toLowerCase()}-id`,
        toObject: () => ({ _id: `mock-${modelName.toLowerCase()}-id` }),
    }),

    find: vi.fn<[Record<string, unknown>?], Promise<MockMongooseDocument[]>>().mockResolvedValue([]),

    findById: vi.fn<[string], Promise<MockMongooseDocument | null>>().mockResolvedValue({
        _id: `mock-${modelName.toLowerCase()}-id`,
        toObject: () => ({ _id: `mock-${modelName.toLowerCase()}-id` }),
    }),

    findOne: vi.fn<[Record<string, unknown>], Promise<MockMongooseDocument | null>>().mockResolvedValue({
        _id: `mock-${modelName.toLowerCase()}-id`,
        toObject: () => ({ _id: `mock-${modelName.toLowerCase()}-id` }),
    }),

    findByIdAndUpdate: vi
        .fn<[string, Record<string, unknown>, Record<string, unknown>?], Promise<MockMongooseDocument | null>>()
        .mockResolvedValue({
            _id: `mock-${modelName.toLowerCase()}-id`,
            toObject: () => ({ _id: `mock-${modelName.toLowerCase()}-id` }),
        }),

    deleteOne: vi
        .fn<[Record<string, unknown>], Promise<{ deletedCount: number }>>()
        .mockResolvedValue({ deletedCount: 1 }),

    deleteMany: vi
        .fn<[Record<string, unknown>], Promise<{ deletedCount: number }>>()
        .mockResolvedValue({ deletedCount: 1 }),

    modelName,
});

// ============================================================================
// EXPRESS MOCKS
// ============================================================================

export const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    cookies: {},
    user: undefined,
    ...overrides,
});

export const createMockResponse = (): Partial<Response> => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.send = vi.fn().mockReturnValue(res);
    res.cookie = vi.fn().mockReturnValue(res);
    res.clearCookie = vi.fn().mockReturnValue(res);
    return res;
};

export const createMockNext = (): NextFunction => vi.fn();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const resetAllMocks = (): void => {
    vi.clearAllMocks();
};

export const createTestUser = (overrides: Partial<MockUser> = {}): MockUser => ({
    _id: 'mock-user-id',
    email: 'test@example.com',
    username: 'testuser',
    role: 'user',
    isAdmin: false,
    isActive: true,
    isDeleted: false,
    photo: 'default.png',
    ...overrides,
});

export const createTestTokens = (): MockTokenPair => ({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
});

// ============================================================================
// EXPORT ALL MOCKS
// ============================================================================

export const simpleMocks = {
    tokenService: mockTokenService,
    userService: mockUserService,
    businessService: mockBusinessService,
    cacheService: mockCacheService,
    cacheAlertService: mockCacheAlertService,
    logger: mockLogger,

    // Utilities
    createMockModel,
    createMockRequest,
    createMockResponse,
    createMockNext,
    resetAllMocks,
    createTestUser,
    createTestTokens,
};
