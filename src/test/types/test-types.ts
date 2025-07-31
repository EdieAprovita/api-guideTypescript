/**
 * Unified Test Types for Consistent Mocking and Testing
 * 
 * This file provides TypeScript types for all test mocks and utilities
 * to ensure type safety and consistency across all test files.
 */

import type { MockedFunction, MockedClass, Mocked } from 'vitest';
import type { Request, Response } from 'express';

// ============================================================================
// CORE TEST INTERFACES
// ============================================================================

export interface TestUser {
    _id: string;
    userId: string;
    username: string;
    email: string;
    role: 'user' | 'admin' | 'professional';
    isAdmin: boolean;
    isActive: boolean;
    isDeleted: boolean;
    photo?: string;
    matchPassword?: MockedFunction<(password: string) => Promise<boolean>>;
    save?: MockedFunction<() => Promise<TestUser>>;
}

export interface TestRequest extends Partial<Request> {
    user?: TestUser;
    headers: Record<string, string>;
    cookies?: Record<string, string>;
    body?: Record<string, unknown>;
    params?: Record<string, string>;
    query?: Record<string, unknown>;
}

export interface TestResponse extends Partial<Response> {
    status: MockedFunction<(code: number) => TestResponse>;
    json: MockedFunction<(data: unknown) => TestResponse>;
    cookie: MockedFunction<(name: string, value: string, options?: unknown) => TestResponse>;
    clearCookie: MockedFunction<(name: string) => TestResponse>;
    send: MockedFunction<(data: unknown) => TestResponse>;
}

// ============================================================================
// SERVICE MOCK INTERFACES
// ============================================================================

export interface MockedCacheService {
    get: MockedFunction<(key: string) => Promise<unknown | null>>;
    set: MockedFunction<(key: string, value: unknown, type?: string, options?: unknown) => Promise<void>>;
    setWithTags: MockedFunction<(key: string, value: unknown, tags: string[], ttl?: number) => Promise<void>>;
    invalidate: MockedFunction<(key: string) => Promise<void>>;
    invalidatePattern: MockedFunction<(pattern: string) => Promise<void>>;
    invalidateByTag: MockedFunction<(tag: string) => Promise<void>>;
    getStats: MockedFunction<() => Promise<{
        hitRatio: number;
        totalRequests: number;
        cacheSize: number;
        memoryUsage: string;
        uptime: number;
    }>>;
    flush: MockedFunction<() => Promise<void>>;
    exists: MockedFunction<(key: string) => Promise<boolean>>;
    expire: MockedFunction<(key: string, ttl: number) => Promise<void>>;
    disconnect: MockedFunction<() => Promise<void>>;
}

export interface MockedRedis {
    get: MockedFunction<(key: string) => Promise<string | null>>;
    set: MockedFunction<(key: string, value: string) => Promise<'OK'>>;
    setex: MockedFunction<(key: string, ttl: number, value: string) => Promise<'OK'>>;
    del: MockedFunction<(...keys: string[]) => Promise<number>>;
    exists: MockedFunction<(key: string) => Promise<number>>;
    expire: MockedFunction<(key: string, ttl: number) => Promise<number>>;
    scan: MockedFunction<(cursor: string, ...args: string[]) => Promise<[string, string[]]>>;
    info: MockedFunction<(section?: string) => Promise<string>>;
    dbsize: MockedFunction<() => Promise<number>>;
    flushdb: MockedFunction<() => Promise<'OK'>>;
    quit: MockedFunction<() => Promise<'OK'>>;
    on: MockedFunction<(event: string, callback: (...args: unknown[]) => void) => MockedRedis>;
    off: MockedFunction<(event: string, callback?: (...args: unknown[]) => void) => MockedRedis>;
    connect: MockedFunction<() => Promise<void>>;
    disconnect: MockedFunction<() => Promise<void>>;
    ping: MockedFunction<() => Promise<'PONG'>>;
    status: string;
}

export interface MockedTokenService {
    generateTokens: MockedFunction<(userId: string, email: string, role: string) => Promise<{
        accessToken: string;
        refreshToken: string;
    }>>;
    generateTokenPair: MockedFunction<(payload: Record<string, unknown>) => Promise<{
        accessToken: string;
        refreshToken: string;
    }>>;
    verifyAccessToken: MockedFunction<(token: string) => Promise<{
        userId: string;
        email: string;
        role: string;
    }>>;
    verifyRefreshToken: MockedFunction<(token: string) => Promise<{
        userId: string;
        email: string;
        role: string;
        type: string;
    }>>;
    refreshTokens: MockedFunction<(refreshToken: string) => Promise<{
        accessToken: string;
        refreshToken: string;
    }>>;
    blacklistToken: MockedFunction<(token: string) => Promise<void>>;
    isTokenBlacklisted: MockedFunction<(token: string) => Promise<boolean>>;
    revokeAllUserTokens: MockedFunction<(userId: string) => Promise<void>>;
    isUserTokensRevoked: MockedFunction<(userId: string) => Promise<boolean>>;
    revokeRefreshToken: MockedFunction<(token: string) => Promise<void>>;
    clearAllForTesting: MockedFunction<() => Promise<void>>;
    disconnect: MockedFunction<() => Promise<void>>;
}

export interface UserServiceResponse {
    success: boolean;
    user?: TestUser;
    message?: string;
    error?: string;
    tokens?: {
        access: string;
        refresh: string;
    };
}

export interface MockedUserService {
    registerUser: MockedFunction<(userData: unknown) => Promise<UserServiceResponse>>;
    loginUser: MockedFunction<(credentials: { email: string; password: string }) => Promise<UserServiceResponse>>;
    getUserById: MockedFunction<(id: string) => Promise<TestUser | null>>;
    updateUser: MockedFunction<(id: string, updateData: unknown) => Promise<UserServiceResponse>>;
    deleteUser: MockedFunction<(id: string) => Promise<UserServiceResponse>>;
    getAllUsers: MockedFunction<() => Promise<TestUser[]>>;
}

export interface MockedCacheAlertService {
    startMonitoring: MockedFunction<() => void>;
    stopMonitoring: MockedFunction<() => void>;
    checkMetrics: MockedFunction<() => Promise<void>>;
    getConfig: MockedFunction<() => unknown>;
    updateConfig: MockedFunction<(config: unknown) => void>;
    getMonitoringStatus: MockedFunction<() => { isRunning: boolean; lastCheck?: Date }>;
    getActiveAlerts: MockedFunction<() => unknown[]>;
    getAllAlerts: MockedFunction<() => unknown[]>;
    parseMemoryToMB: MockedFunction<(memory: string) => number>;
}

// ============================================================================
// MODEL MOCK INTERFACES
// ============================================================================

export interface MockedUserModel {
    create: MockedFunction<(userData: unknown) => Promise<TestUser>>;
    findOne: MockedFunction<(query: unknown) => Promise<TestUser | null>>;
    findById: MockedFunction<(id: string) => Promise<TestUser | null>>;
    findByIdAndUpdate: MockedFunction<(id: string, update: unknown, options?: unknown) => Promise<TestUser | null>>;
    findByIdAndDelete: MockedFunction<(id: string) => Promise<TestUser | null>>;
    find: MockedFunction<(query?: unknown) => Promise<TestUser[]>>;
}

// ============================================================================
// JWT MOCK INTERFACE
// ============================================================================

export interface MockedJWT {
    sign: MockedFunction<(payload: Record<string, unknown>, secret: string, options?: unknown) => string>;
    verify: MockedFunction<(token: string, secret: string) => Record<string, unknown>>;
    decode: MockedFunction<(token: string) => Record<string, unknown> | null>;
}

// ============================================================================
// LOGGER MOCK INTERFACE
// ============================================================================

export interface MockedLogger {
    info: MockedFunction<(message: string, ...args: unknown[]) => void>;
    error: MockedFunction<(message: string, ...args: unknown[]) => void>;
    warn: MockedFunction<(message: string, ...args: unknown[]) => void>;
    debug: MockedFunction<(message: string, ...args: unknown[]) => void>;
}

// ============================================================================
// MIDDLEWARE MOCK INTERFACES
// ============================================================================

export type MockedMiddleware = MockedFunction<(req: TestRequest, res: TestResponse, next: () => void) => void>;

export interface MockedAuthMiddleware {
    protect: MockedMiddleware;
    admin: MockedMiddleware;
    professional: MockedMiddleware;
    requireAuth: MockedMiddleware;
    checkOwnership: MockedFunction<() => MockedMiddleware>;
    logout: MockedMiddleware;
    refreshToken: MockedMiddleware;
    revokeAllTokens: MockedMiddleware;
}

export interface MockedValidationMiddleware {
    validate: MockedFunction<(schema: unknown) => MockedMiddleware>;
    sanitizeInput: MockedFunction<() => MockedMiddleware[]>;
    createRateLimit: MockedFunction<(options: unknown) => MockedMiddleware>;
    rateLimits: {
        api: MockedMiddleware;
        auth: MockedMiddleware;
        upload: MockedMiddleware;
        search: MockedMiddleware;
        register: MockedMiddleware;
    };
    handleValidationError: MockedMiddleware;
    securityHeaders: MockedMiddleware;
    validateInputLength: MockedFunction<(options: unknown) => MockedMiddleware>;
}

// ============================================================================
// TEST CONTEXT AND CONSTANTS
// ============================================================================

export interface TestContext {
    admin: {
        userId: string;
        email: string;
        token: string;
        refreshToken: string;
        user: TestUser;
    };
    professional: {
        userId: string;
        email: string;
        token: string;
        refreshToken: string;
        user: TestUser;
    };
    regularUser: {
        userId: string;
        email: string;
        token: string;
        refreshToken: string;
        user: TestUser;
    };
}

export const TEST_CONSTANTS = {
    ADMIN_USER_ID: '507f1f77bcf86cd799439011',
    ADMIN_EMAIL: 'admin@test.com',
    ADMIN_USERNAME: 'testadmin',
    ADMIN_TOKEN: 'master_test_token_admin',
    ADMIN_REFRESH_TOKEN: 'master_refresh_token_admin',
    
    PROFESSIONAL_USER_ID: '507f1f77bcf86cd799439012',
    PROFESSIONAL_EMAIL: 'professional@test.com',
    PROFESSIONAL_USERNAME: 'testprofessional',
    
    USER_ID: '507f1f77bcf86cd799439013',
    USER_EMAIL: 'user@test.com',
    USER_USERNAME: 'testuser',
    
    JWT_SECRET: 'master_test_secret_key_12345',
    JWT_REFRESH_SECRET: 'master_refresh_secret_12345',
    
    BUSINESS_ID: '507f1f77bcf86cd799439020',
    RESTAURANT_ID: '507f1f77bcf86cd799439021',
    REVIEW_ID: '507f1f77bcf86cd799439022',
} as const;

// ============================================================================
// TEST UTILITIES TYPES
// ============================================================================

export interface TestSetupOptions {
    withDatabase?: boolean;
    withRedis?: boolean;
    mockExternalServices?: boolean;
    testTimeout?: number;
}

export interface MockFactoryOptions {
    useRealTypes?: boolean;
    mockExternalDependencies?: boolean;
    enableLogging?: boolean;
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
    MockedClass,
    MockedFunction,
    Mocked,
};