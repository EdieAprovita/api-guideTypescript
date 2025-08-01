import { vi, MockedFunction } from 'vitest';
/**
 * TypeScript interfaces for test mocks to eliminate 'any' usage
 * These provide proper typing for all mock objects used in tests
 */

import { NextFunction, Response } from 'express';
import { faker } from '@faker-js/faker';

// Base user interface for testing
export interface TestUser {
    _id: string;
    username: string;
    email: string;
    password?: string;
    role: string;
    isActive: boolean;
    isDeleted: boolean;
    photo?: string;
    createdAt: Date;
    updatedAt: Date;
    matchPassword?: MockedFunction<(password: string) => Promise<boolean>>;
    save?: MockedFunction<() => Promise<TestUser>>;
    [key: string]: unknown;
}

// Mock user document interface
export interface MockUserDocument extends TestUser {
    _id: string;
    toObject?: () => TestUser;
}

// Mock query interface for Mongoose queries
export interface MockQuery<T = unknown> {
    select: MockedFunction<(fields: string) => Promise<T>>;
    exec?: MockedFunction<() => Promise<T>>;
    lean?: MockedFunction<() => Promise<T>>;
    sort?: MockedFunction<(sort: Record<string, number>) => MockQuery<T>>;
    limit?: MockedFunction<(limit: number) => MockQuery<T>>;
    skip?: MockedFunction<(skip: number) => MockQuery<T>>;
    where?: MockedFunction<(field: string, value: unknown) => MockQuery<T>>;
    [key: string]: unknown;
}

// Mock response interface - standalone to avoid type conflicts
export interface MockResponse {
    status: MockedFunction<(code: number) => MockResponse>;
    json: MockedFunction<(data: unknown) => MockResponse>;
    send: MockedFunction<(data: unknown) => MockResponse>;
    cookie: MockedFunction<(name: string, value: string, options?: unknown) => MockResponse>;
    clearCookie: MockedFunction<(name: string) => MockResponse>;
    setHeader?: MockedFunction<(name: string, value: string) => MockResponse>;
    end?: MockedFunction<() => MockResponse>;
    sendStatus?: MockedFunction<(code: number) => MockResponse>;
    redirect?: MockedFunction<(url: string) => MockResponse>;
    location?: MockedFunction<(url: string) => MockResponse>;
    links?: MockedFunction<(links: Record<string, string>) => MockResponse>;
    attachment?: MockedFunction<(filename?: string) => MockResponse>;
    download?: MockedFunction<(path: string, filename?: string) => MockResponse>;
    type?: MockedFunction<(type: string) => MockResponse>;
    vary?: MockedFunction<(field: string) => MockResponse>;
    format?: MockedFunction<(obj: Record<string, unknown>) => MockResponse>;
    [key: string]: unknown; // Allow additional properties for flexibility
}

// Mock request interface
export interface MockRequest {
    body: Record<string, unknown>;
    params: Record<string, unknown>;
    query: Record<string, unknown>;
    headers: Record<string, unknown>;
    user?: TestUser | null;
    cookies?: Record<string, string>;
    session?: Record<string, unknown>;
    [key: string]: unknown;
}

// Mock next function interface
export interface MockNextFunction extends MockedFunction<NextFunction> {}

// Generic model mock interface - reduces duplication across all model types
export interface MockModel<T = unknown> {
    findOne: MockedFunction<(filter: Record<string, unknown>) => MockQuery<T | null>>;
    findById: MockedFunction<(id: string) => Promise<T | null>>;
    findByIdAndDelete: MockedFunction<(id: string) => Promise<T | null>>;
    find: MockedFunction<(filter?: Record<string, unknown>) => Promise<T[]>>;
    create: MockedFunction<(data: Partial<T>) => Promise<T>>;
    updateOne?: MockedFunction<(filter: Record<string, unknown>, update: Record<string, unknown>) => Promise<unknown>>;
    deleteOne?: MockedFunction<(filter: Record<string, unknown>) => Promise<unknown>>;
    countDocuments?: MockedFunction<(filter?: Record<string, unknown>) => Promise<number>>;
    findByIdAndUpdate?: MockedFunction<
        (id: string, update: Record<string, unknown>, options?: Record<string, unknown>) => Promise<T | null>
    >;
}

// Specific model type aliases using the generic interface
export type MockUserModel = MockModel<TestUser>;
export type MockBusinessModel = MockModel<unknown>;
export type MockRestaurantModel = MockModel<unknown>;
export type MockReviewModel = MockModel<unknown>;
export type MockDoctorModel = MockModel<unknown>;
export type MockMarketModel = MockModel<unknown>;
export type MockSanctuaryModel = MockModel<unknown>;
export type MockRecipeModel = MockModel<unknown>;
export type MockPostModel = MockModel<unknown>;
export type MockProfessionModel = MockModel<unknown>;
export type MockProfessionProfileModel = MockModel<unknown>;

// Redis mock interface
export interface MockRedis {
    connect: MockedFunction<() => Promise<void>>;
    disconnect: MockedFunction<() => Promise<void>>;
    get: MockedFunction<(key: string) => Promise<string | null>>;
    set: MockedFunction<(key: string, value: string) => Promise<void>>;
    setex: MockedFunction<(key: string, ttl: number, value: string) => Promise<void>>;
    del: MockedFunction<(key: string) => Promise<number>>;
    exists: MockedFunction<(key: string) => Promise<number>>;
    expire: MockedFunction<(key: string, ttl: number) => Promise<number>>;
    ttl: MockedFunction<(key: string) => Promise<number>>;
    keys: MockedFunction<(pattern: string) => Promise<string[]>>;
    flushdb: MockedFunction<() => Promise<void>>;
    on: MockedFunction<(event: string, callback: () => void) => MockRedis>;
    off: MockedFunction<(event: string, callback: () => void) => MockRedis>;
    ping: MockedFunction<() => Promise<string>>;
    info: MockedFunction<(section?: string) => Promise<string>>;
    memory: MockedFunction<(usage: string) => Promise<unknown>>;
}

// JWT mock interface
export interface MockJWT {
    sign: MockedFunction<
        (payload: Record<string, unknown>, secret: string, options?: Record<string, unknown>) => string
    >;
    verify: MockedFunction<(token: string, secret: string) => Record<string, unknown>>;
    decode: MockedFunction<(token: string) => Record<string, unknown> | null>;
}

// BCrypt mock interface
export interface MockBCrypt {
    hash: MockedFunction<(data: string, saltRounds: number) => Promise<string>>;
    compare: MockedFunction<(data: string, encrypted: string) => Promise<boolean>>;
    genSalt: MockedFunction<(rounds: number) => Promise<string>>;
}

// Generic service mock interface - reduces duplication across all service types
export interface MockService<T = unknown> {
    // Common CRUD operations
    create?: MockedFunction<(data: Record<string, unknown>) => Promise<T>>;
    findById?: MockedFunction<(id: string) => Promise<T | null>>;
    findByIdCached?: MockedFunction<(id: string) => Promise<T | null>>;
    update?: MockedFunction<(id: string, updateData: Record<string, unknown>) => Promise<T>>;
    updateById?: MockedFunction<(id: string, updateData: Record<string, unknown>) => Promise<T>>;
    delete?: MockedFunction<(id: string) => Promise<{ message: string }>>;
    deleteById?: MockedFunction<(id: string) => Promise<{ message: string }>>;
    getAll?: MockedFunction<() => Promise<T[]>>;
    getAllCached?: MockedFunction<() => Promise<T[]>>;
    // Common specialized operations
    addReview?: MockedFunction<(reviewData: Record<string, unknown>) => Promise<unknown>>;
    getTopRatedReviews?: MockedFunction<() => Promise<unknown[]>>;
}

// Specific service type aliases using the generic interface
export type MockUserService = MockService<TestUser> & {
    registerUser: MockedFunction<(userData: Record<string, unknown>, res: MockResponse) => Promise<TestUser>>;
    loginUser: MockedFunction<(email: string, password: string, res: MockResponse) => Promise<TestUser>>;
    findAllUsers: MockedFunction<() => Promise<TestUser[]>>;
    findUserById: MockedFunction<(id: string) => Promise<TestUser | null>>;
    updateUserById: MockedFunction<(id: string, updateData: Record<string, unknown>) => Promise<TestUser>>;
    deleteUserById: MockedFunction<(id: string) => Promise<{ message: string }>>;
};

export type MockBusinessService = MockService<unknown>;
export type MockRestaurantService = MockService<unknown>;
export type MockReviewService = MockService<unknown>;
export type MockDoctorService = MockService<unknown>;
export type MockMarketService = MockService<unknown>;
export type MockSanctuaryService = MockService<unknown>;
export type MockRecipeService = MockService<unknown>;
export type MockPostService = MockService<unknown>;
export type MockProfessionService = MockService<unknown>;
export type MockProfessionProfileService = MockService<unknown>;

// Cache service mock interface
export interface MockCacheService {
    get: MockedFunction<(key: string) => Promise<string | null>>;
    set: MockedFunction<(key: string, value: string, ttl?: number) => Promise<void>>;
    delete: MockedFunction<(key: string) => Promise<number>>;
    exists: MockedFunction<(key: string) => Promise<boolean>>;
    flush: MockedFunction<() => Promise<void>>;
    getStats: MockedFunction<() => Promise<Record<string, unknown>>>;
    isConnected: MockedFunction<() => boolean>;
    connect: MockedFunction<() => Promise<void>>;
    disconnect: MockedFunction<() => Promise<void>>;
}

// Token service mock interface
export interface MockTokenService {
    generateAccessToken: MockedFunction<(userId: string) => string>;
    generateRefreshToken: MockedFunction<(userId: string) => string>;
    verifyAccessToken: MockedFunction<(token: string) => Promise<Record<string, unknown>>>;
    verifyRefreshToken: MockedFunction<(token: string) => Promise<Record<string, unknown>>>;
    revokeToken: MockedFunction<(token: string) => Promise<void>>;
    isTokenRevoked: MockedFunction<(token: string) => Promise<boolean>>;
}

// Geo service mock interface
export interface MockGeoService {
    geocodeAddress: MockedFunction<(address: string) => Promise<{ latitude: number; longitude: number }>>;
    reverseGeocode: MockedFunction<(latitude: number, longitude: number) => Promise<{ address: string }>>;
    calculateDistance: MockedFunction<(lat1: number, lon1: number, lat2: number, lon2: number) => number>;
}

// Factory functions for creating mock objects
export const createMockUser = (overrides: Partial<TestUser> = {}): TestUser => ({
    _id: faker.database.mongodbObjectId(),
    username: faker.internet.userName(),
    email: faker.internet.email(),
    role: 'user',
    isActive: true,
    isDeleted: false,
    photo: 'default.png',
    createdAt: new Date(),
    updatedAt: new Date(),
    matchPassword: vi.fn().mockResolvedValue(true),
    save: vi.fn().mockResolvedValue({} as TestUser),
    ...overrides,
});

export const createMockQuery = <T = unknown>(): MockQuery<T> => ({
    select: vi.fn().mockResolvedValue({} as T),
    exec: vi.fn().mockResolvedValue({} as T),
    lean: vi.fn().mockResolvedValue({} as T),
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
});

export const createMockResponse = (): MockResponse => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
});

export const createMockRequest = (overrides: Partial<MockRequest> = {}): MockRequest => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    cookies: {},
    session: {},
    ...overrides,
});

export const createMockNext = (): MockNextFunction => vi.fn();
