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
    matchPassword?: jest.MockedFunction<(password: string) => Promise<boolean>>;
    save?: jest.MockedFunction<() => Promise<TestUser>>;
    [key: string]: unknown;
}

// Mock user document interface
export interface MockUserDocument extends TestUser {
    _id: string;
    toObject?: () => TestUser;
}

// Mock query interface for Mongoose queries
export interface MockQuery<T = unknown> {
    select: jest.MockedFunction<(fields: string) => Promise<T>>;
    exec?: jest.MockedFunction<() => Promise<T>>;
    lean?: jest.MockedFunction<() => Promise<T>>;
    sort?: jest.MockedFunction<(sort: Record<string, number>) => MockQuery<T>>;
    limit?: jest.MockedFunction<(limit: number) => MockQuery<T>>;
    skip?: jest.MockedFunction<(skip: number) => MockQuery<T>>;
    where?: jest.MockedFunction<(field: string, value: unknown) => MockQuery<T>>;
    [key: string]: unknown;
}

// Mock response interface - standalone to avoid type conflicts
export interface MockResponse {
    status: jest.MockedFunction<(code: number) => MockResponse>;
    json: jest.MockedFunction<(data: unknown) => MockResponse>;
    send: jest.MockedFunction<(data: unknown) => MockResponse>;
    cookie: jest.MockedFunction<(name: string, value: string, options?: unknown) => MockResponse>;
    clearCookie: jest.MockedFunction<(name: string) => MockResponse>;
    setHeader?: jest.MockedFunction<(name: string, value: string) => MockResponse>;
    end?: jest.MockedFunction<() => MockResponse>;
    sendStatus?: jest.MockedFunction<(code: number) => MockResponse>;
    redirect?: jest.MockedFunction<(url: string) => MockResponse>;
    location?: jest.MockedFunction<(url: string) => MockResponse>;
    links?: jest.MockedFunction<(links: Record<string, string>) => MockResponse>;
    attachment?: jest.MockedFunction<(filename?: string) => MockResponse>;
    download?: jest.MockedFunction<(path: string, filename?: string) => MockResponse>;
    type?: jest.MockedFunction<(type: string) => MockResponse>;
    vary?: jest.MockedFunction<(field: string) => MockResponse>;
    format?: jest.MockedFunction<(obj: Record<string, unknown>) => MockResponse>;
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
export interface MockNextFunction extends jest.MockedFunction<NextFunction> {}

// Generic model mock interface - reduces duplication across all model types
export interface MockModel<T = unknown> {
    findOne: jest.MockedFunction<(filter: Record<string, unknown>) => MockQuery<T | null>>;
    findById: jest.MockedFunction<(id: string) => Promise<T | null>>;
    findByIdAndDelete: jest.MockedFunction<(id: string) => Promise<T | null>>;
    find: jest.MockedFunction<(filter?: Record<string, unknown>) => Promise<T[]>>;
    create: jest.MockedFunction<(data: Partial<T>) => Promise<T>>;
    updateOne?: jest.MockedFunction<
        (filter: Record<string, unknown>, update: Record<string, unknown>) => Promise<unknown>
    >;
    deleteOne?: jest.MockedFunction<(filter: Record<string, unknown>) => Promise<unknown>>;
    countDocuments?: jest.MockedFunction<(filter?: Record<string, unknown>) => Promise<number>>;
    findByIdAndUpdate?: jest.MockedFunction<
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
    connect: jest.MockedFunction<() => Promise<void>>;
    disconnect: jest.MockedFunction<() => Promise<void>>;
    get: jest.MockedFunction<(key: string) => Promise<string | null>>;
    set: jest.MockedFunction<(key: string, value: string) => Promise<void>>;
    setex: jest.MockedFunction<(key: string, ttl: number, value: string) => Promise<void>>;
    del: jest.MockedFunction<(key: string) => Promise<number>>;
    exists: jest.MockedFunction<(key: string) => Promise<number>>;
    expire: jest.MockedFunction<(key: string, ttl: number) => Promise<number>>;
    ttl: jest.MockedFunction<(key: string) => Promise<number>>;
    keys: jest.MockedFunction<(pattern: string) => Promise<string[]>>;
    flushdb: jest.MockedFunction<() => Promise<void>>;
    on: jest.MockedFunction<(event: string, callback: () => void) => MockRedis>;
    off: jest.MockedFunction<(event: string, callback: () => void) => MockRedis>;
    ping: jest.MockedFunction<() => Promise<string>>;
    info: jest.MockedFunction<(section?: string) => Promise<string>>;
    memory: jest.MockedFunction<(usage: string) => Promise<unknown>>;
}

// JWT mock interface
export interface MockJWT {
    sign: jest.MockedFunction<
        (payload: Record<string, unknown>, secret: string, options?: Record<string, unknown>) => string
    >;
    verify: jest.MockedFunction<(token: string, secret: string) => Record<string, unknown>>;
    decode: jest.MockedFunction<(token: string) => Record<string, unknown> | null>;
}

// BCrypt mock interface
export interface MockBCrypt {
    hash: jest.MockedFunction<(data: string, saltRounds: number) => Promise<string>>;
    compare: jest.MockedFunction<(data: string, encrypted: string) => Promise<boolean>>;
    genSalt: jest.MockedFunction<(rounds: number) => Promise<string>>;
}

// Generic service mock interface - reduces duplication across all service types
export interface MockService<T = unknown> {
    // Common CRUD operations
    create?: jest.MockedFunction<(data: Record<string, unknown>) => Promise<T>>;
    findById?: jest.MockedFunction<(id: string) => Promise<T | null>>;
    findByIdCached?: jest.MockedFunction<(id: string) => Promise<T | null>>;
    update?: jest.MockedFunction<(id: string, updateData: Record<string, unknown>) => Promise<T>>;
    updateById?: jest.MockedFunction<(id: string, updateData: Record<string, unknown>) => Promise<T>>;
    delete?: jest.MockedFunction<(id: string) => Promise<{ message: string }>>;
    deleteById?: jest.MockedFunction<(id: string) => Promise<{ message: string }>>;
    getAll?: jest.MockedFunction<() => Promise<T[]>>;
    getAllCached?: jest.MockedFunction<() => Promise<T[]>>;
    // Common specialized operations
    addReview?: jest.MockedFunction<(reviewData: Record<string, unknown>) => Promise<unknown>>;
    getTopRatedReviews?: jest.MockedFunction<() => Promise<unknown[]>>;
}

// Specific service type aliases using the generic interface
export type MockUserService = MockService<TestUser> & {
    registerUser: jest.MockedFunction<(userData: Record<string, unknown>, res: MockResponse) => Promise<TestUser>>;
    loginUser: jest.MockedFunction<(email: string, password: string, res: MockResponse) => Promise<TestUser>>;
    findAllUsers: jest.MockedFunction<() => Promise<TestUser[]>>;
    findUserById: jest.MockedFunction<(id: string) => Promise<TestUser | null>>;
    updateUserById: jest.MockedFunction<(id: string, updateData: Record<string, unknown>) => Promise<TestUser>>;
    deleteUserById: jest.MockedFunction<(id: string) => Promise<{ message: string }>>;
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
    get: jest.MockedFunction<(key: string) => Promise<string | null>>;
    set: jest.MockedFunction<(key: string, value: string, ttl?: number) => Promise<void>>;
    delete: jest.MockedFunction<(key: string) => Promise<number>>;
    exists: jest.MockedFunction<(key: string) => Promise<boolean>>;
    flush: jest.MockedFunction<() => Promise<void>>;
    getStats: jest.MockedFunction<() => Promise<Record<string, unknown>>>;
    isConnected: jest.MockedFunction<() => boolean>;
    connect: jest.MockedFunction<() => Promise<void>>;
    disconnect: jest.MockedFunction<() => Promise<void>>;
}

// Token service mock interface
export interface MockTokenService {
    generateAccessToken: jest.MockedFunction<(userId: string) => string>;
    generateRefreshToken: jest.MockedFunction<(userId: string) => string>;
    verifyAccessToken: jest.MockedFunction<(token: string) => Promise<Record<string, unknown>>>;
    verifyRefreshToken: jest.MockedFunction<(token: string) => Promise<Record<string, unknown>>>;
    revokeToken: jest.MockedFunction<(token: string) => Promise<void>>;
    isTokenRevoked: jest.MockedFunction<(token: string) => Promise<boolean>>;
}

// Geo service mock interface
export interface MockGeoService {
    geocodeAddress: jest.MockedFunction<(address: string) => Promise<{ latitude: number; longitude: number }>>;
    reverseGeocode: jest.MockedFunction<(latitude: number, longitude: number) => Promise<{ address: string }>>;
    calculateDistance: jest.MockedFunction<(lat1: number, lon1: number, lat2: number, lon2: number) => number>;
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
    matchPassword: jest.fn().mockResolvedValue(true),
    save: jest.fn().mockResolvedValue({} as TestUser),
    ...overrides,
});

export const createMockQuery = <T = unknown>(): MockQuery<T> => ({
    select: jest.fn().mockResolvedValue({} as T),
    exec: jest.fn().mockResolvedValue({} as T),
    lean: jest.fn().mockResolvedValue({} as T),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
});

export const createMockResponse = (): MockResponse => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
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

export const createMockNext = (): MockNextFunction => jest.fn();
