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
    matchPassword?: vi.MockedFunction<(password: string) => Promise<boolean>>;
    save?: vi.MockedFunction<() => Promise<TestUser>>;
    [key: string]: unknown;
}

// Mock user document interface
export interface MockUserDocument extends TestUser {
    _id: string;
    toObject?: () => TestUser;
}

// Mock query interface for Mongoose queries
export interface MockQuery<T = unknown> {
    select: vi.MockedFunction<(fields: string) => Promise<T>>;
    exec?: vi.MockedFunction<() => Promise<T>>;
    lean?: vi.MockedFunction<() => Promise<T>>;
    sort?: vi.MockedFunction<(sort: Record<string, number>) => MockQuery<T>>;
    limit?: vi.MockedFunction<(limit: number) => MockQuery<T>>;
    skip?: vi.MockedFunction<(skip: number) => MockQuery<T>>;
    where?: vi.MockedFunction<(field: string, value: unknown) => MockQuery<T>>;
    [key: string]: unknown;
}

// Mock response interface - standalone to avoid type conflicts
export interface MockResponse {
    status: vi.MockedFunction<(code: number) => MockResponse>;
    json: vi.MockedFunction<(data: unknown) => MockResponse>;
    send: vi.MockedFunction<(data: unknown) => MockResponse>;
    cookie: vi.MockedFunction<(name: string, value: string, options?: unknown) => MockResponse>;
    clearCookie: vi.MockedFunction<(name: string) => MockResponse>;
    setHeader?: vi.MockedFunction<(name: string, value: string) => MockResponse>;
    end?: vi.MockedFunction<() => MockResponse>;
    sendStatus?: vi.MockedFunction<(code: number) => MockResponse>;
    redirect?: vi.MockedFunction<(url: string) => MockResponse>;
    location?: vi.MockedFunction<(url: string) => MockResponse>;
    links?: vi.MockedFunction<(links: Record<string, string>) => MockResponse>;
    attachment?: vi.MockedFunction<(filename?: string) => MockResponse>;
    download?: vi.MockedFunction<(path: string, filename?: string) => MockResponse>;
    type?: vi.MockedFunction<(type: string) => MockResponse>;
    vary?: vi.MockedFunction<(field: string) => MockResponse>;
    format?: vi.MockedFunction<(obj: Record<string, unknown>) => MockResponse>;
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
export interface MockNextFunction extends vi.MockedFunction<NextFunction> {}

// Generic model mock interface - reduces duplication across all model types
export interface MockModel<T = unknown> {
    findOne: vi.MockedFunction<(filter: Record<string, unknown>) => MockQuery<T | null>>;
    findById: vi.MockedFunction<(id: string) => Promise<T | null>>;
    findByIdAndDelete: vi.MockedFunction<(id: string) => Promise<T | null>>;
    find: vi.MockedFunction<(filter?: Record<string, unknown>) => Promise<T[]>>;
    create: vi.MockedFunction<(data: Partial<T>) => Promise<T>>;
    updateOne?: vi.MockedFunction<
        (filter: Record<string, unknown>, update: Record<string, unknown>) => Promise<unknown>
    >;
    deleteOne?: vi.MockedFunction<(filter: Record<string, unknown>) => Promise<unknown>>;
    countDocuments?: vi.MockedFunction<(filter?: Record<string, unknown>) => Promise<number>>;
    findByIdAndUpdate?: vi.MockedFunction<
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
    connect: vi.MockedFunction<() => Promise<void>>;
    disconnect: vi.MockedFunction<() => Promise<void>>;
    get: vi.MockedFunction<(key: string) => Promise<string | null>>;
    set: vi.MockedFunction<(key: string, value: string) => Promise<void>>;
    setex: vi.MockedFunction<(key: string, ttl: number, value: string) => Promise<void>>;
    del: vi.MockedFunction<(key: string) => Promise<number>>;
    exists: vi.MockedFunction<(key: string) => Promise<number>>;
    expire: vi.MockedFunction<(key: string, ttl: number) => Promise<number>>;
    ttl: vi.MockedFunction<(key: string) => Promise<number>>;
    keys: vi.MockedFunction<(pattern: string) => Promise<string[]>>;
    flushdb: vi.MockedFunction<() => Promise<void>>;
    on: vi.MockedFunction<(event: string, callback: () => void) => MockRedis>;
    off: vi.MockedFunction<(event: string, callback: () => void) => MockRedis>;
    ping: vi.MockedFunction<() => Promise<string>>;
    info: vi.MockedFunction<(section?: string) => Promise<string>>;
    memory: vi.MockedFunction<(usage: string) => Promise<unknown>>;
}

// JWT mock interface
export interface MockJWT {
    sign: vi.MockedFunction<
        (payload: Record<string, unknown>, secret: string, options?: Record<string, unknown>) => string
    >;
    verify: vi.MockedFunction<(token: string, secret: string) => Record<string, unknown>>;
    decode: vi.MockedFunction<(token: string) => Record<string, unknown> | null>;
}

// BCrypt mock interface
export interface MockBCrypt {
    hash: vi.MockedFunction<(data: string, saltRounds: number) => Promise<string>>;
    compare: vi.MockedFunction<(data: string, encrypted: string) => Promise<boolean>>;
    genSalt: vi.MockedFunction<(rounds: number) => Promise<string>>;
}

// Generic service mock interface - reduces duplication across all service types
export interface MockService<T = unknown> {
    // Common CRUD operations
    create?: vi.MockedFunction<(data: Record<string, unknown>) => Promise<T>>;
    findById?: vi.MockedFunction<(id: string) => Promise<T | null>>;
    findByIdCached?: vi.MockedFunction<(id: string) => Promise<T | null>>;
    update?: vi.MockedFunction<(id: string, updateData: Record<string, unknown>) => Promise<T>>;
    updateById?: vi.MockedFunction<(id: string, updateData: Record<string, unknown>) => Promise<T>>;
    delete?: vi.MockedFunction<(id: string) => Promise<{ message: string }>>;
    deleteById?: vi.MockedFunction<(id: string) => Promise<{ message: string }>>;
    getAll?: vi.MockedFunction<() => Promise<T[]>>;
    getAllCached?: vi.MockedFunction<() => Promise<T[]>>;
    // Common specialized operations
    addReview?: vi.MockedFunction<(reviewData: Record<string, unknown>) => Promise<unknown>>;
    getTopRatedReviews?: vi.MockedFunction<() => Promise<unknown[]>>;
}

// Specific service type aliases using the generic interface
export type MockUserService = MockService<TestUser> & {
    registerUser: vi.MockedFunction<(userData: Record<string, unknown>, res: MockResponse) => Promise<TestUser>>;
    loginUser: vi.MockedFunction<(email: string, password: string, res: MockResponse) => Promise<TestUser>>;
    findAllUsers: vi.MockedFunction<() => Promise<TestUser[]>>;
    findUserById: vi.MockedFunction<(id: string) => Promise<TestUser | null>>;
    updateUserById: vi.MockedFunction<(id: string, updateData: Record<string, unknown>) => Promise<TestUser>>;
    deleteUserById: vi.MockedFunction<(id: string) => Promise<{ message: string }>>;
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
    get: vi.MockedFunction<(key: string) => Promise<string | null>>;
    set: vi.MockedFunction<(key: string, value: string, ttl?: number) => Promise<void>>;
    delete: vi.MockedFunction<(key: string) => Promise<number>>;
    exists: vi.MockedFunction<(key: string) => Promise<boolean>>;
    flush: vi.MockedFunction<() => Promise<void>>;
    getStats: vi.MockedFunction<() => Promise<Record<string, unknown>>>;
    isConnected: vi.MockedFunction<() => boolean>;
    connect: vi.MockedFunction<() => Promise<void>>;
    disconnect: vi.MockedFunction<() => Promise<void>>;
}

// Token service mock interface
export interface MockTokenService {
    generateAccessToken: vi.MockedFunction<(userId: string) => string>;
    generateRefreshToken: vi.MockedFunction<(userId: string) => string>;
    verifyAccessToken: vi.MockedFunction<(token: string) => Promise<Record<string, unknown>>>;
    verifyRefreshToken: vi.MockedFunction<(token: string) => Promise<Record<string, unknown>>>;
    revokeToken: vi.MockedFunction<(token: string) => Promise<void>>;
    isTokenRevoked: vi.MockedFunction<(token: string) => Promise<boolean>>;
}

// Geo service mock interface
export interface MockGeoService {
    geocodeAddress: vi.MockedFunction<(address: string) => Promise<{ latitude: number; longitude: number }>>;
    reverseGeocode: vi.MockedFunction<(latitude: number, longitude: number) => Promise<{ address: string }>>;
    calculateDistance: vi.MockedFunction<(lat1: number, lon1: number, lat2: number, lon2: number) => number>;
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
