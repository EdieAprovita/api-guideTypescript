import { Request, Response, NextFunction } from 'express';

// Tipos específicos para testing
export interface TestUser {
    _id: string;
    role: string;
    email?: string;
}

// Mock data types that avoid Mongoose Document interface requirements
export type MockRestaurant = {
    _id: string;
    restaurantName: string;
    author: string;
    typePlace: string;
    address: string;
    location: { type: string; coordinates: number[] };
    image: string;
    budget: string;
    contact: any[];
    cuisine: string[];
    reviews: any[];
    rating: number;
    numReviews: number;
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
};

export type MockDoctor = {
    _id: string;
    doctorName: string;
    author: string;
    address: string;
    location: { type: string; coordinates: number[] };
    image: string;
    budget: string;
    contact: any[];
    expertise: string[];
    reviews: any[];
    rating: number;
    numReviews: number;
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
};

export type MockMarket = {
    _id: string;
    marketName: string;
    author: string;
    address: string;
    location: { type: string; coordinates: number[] };
    image: string;
    typeMarket: string;
    contact: any[];
    reviews: any[];
    rating: number;
    numReviews: number;
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
};

export type MockSanctuary = {
    _id: string;
    sanctuaryName: string;
    author: string;
    address: string;
    location: { type: string; coordinates: number[] };
    image: string;
    typeofSanctuary: string;
    animals: any[];
    capacity: number;
    caretakers: string[];
    contact: any[];
    reviews: any[];
    rating: number;
    numReviews: number;
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
};

export type MockReview = {
    _id: string;
    rating: number;
    comment: string;
};

// Service mock interfaces
export interface MockServiceMethods<T> {
    getAll: jest.MockedFunction<() => Promise<T[]>>;
    getAllCached: jest.MockedFunction<() => Promise<T[]>>;
    findById: jest.MockedFunction<(id: string) => Promise<T | null>>;
    findByIdCached: jest.MockedFunction<(id: string) => Promise<T | null>>;
    create: jest.MockedFunction<(data: Partial<T>) => Promise<T>>;
    createCached: jest.MockedFunction<(data: Partial<T>) => Promise<T>>;
    updateById: jest.MockedFunction<(id: string, data: Partial<T>) => Promise<T | null>>;
    updateByIdCached: jest.MockedFunction<(id: string, data: Partial<T>) => Promise<T | null>>;
    deleteById: jest.MockedFunction<(id: string) => Promise<void>>;
}

export interface MockRestaurantService extends MockServiceMethods<MockRestaurant> {}
export interface MockDoctorService extends MockServiceMethods<MockDoctor> {}
export interface MockMarketService extends MockServiceMethods<MockMarket> {}
export interface MockSanctuaryService extends MockServiceMethods<MockSanctuary> {}

export interface MockReviewService {
    getTopRatedReviews: jest.MockedFunction<() => Promise<MockReview[]>>;
    addReview: jest.MockedFunction<(data: Partial<MockReview>) => Promise<MockReview>>;
    getAll: jest.MockedFunction<() => Promise<MockReview[]>>;
    findById: jest.MockedFunction<(id: string) => Promise<MockReview | null>>;
    create: jest.MockedFunction<(data: Partial<MockReview>) => Promise<MockReview>>;
    updateById: jest.MockedFunction<(id: string, data: Partial<MockReview>) => Promise<MockReview | null>>;
    deleteById: jest.MockedFunction<(id: string) => Promise<void>>;
}

// Tipos para middleware mocking
export type TestMiddleware = (req: Request, res: Response, next: NextFunction) => void;
export type TestController = (req: Request, res: Response) => void | Promise<void>;

// Utilidades para mocking
export interface AuthMock {
    protect: jest.MockedFunction<TestMiddleware>;
    admin: jest.MockedFunction<TestMiddleware>;
    professional: jest.MockedFunction<TestMiddleware>;
    requireAuth: jest.MockedFunction<TestMiddleware>;
    checkOwnership: jest.MockedFunction<() => TestMiddleware>;
    logout: jest.MockedFunction<TestController>;
    refreshToken: jest.MockedFunction<TestController>;
    revokeAllTokens: jest.MockedFunction<TestController>;
}
