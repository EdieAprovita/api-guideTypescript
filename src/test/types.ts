import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { 
    MockRestaurant, 
    MockBusiness, 
    MockMarket, 
    MockSanctuary,
    MockServiceMethods,
    MockRestaurantService,
    MockBusinessService,
    MockMarketService,
    MockSanctuaryService
} from './types/baseTypes';

// Tipos específicos para testing
export interface TestUser {
    _id: string;
    role: string;
    email?: string;
}

// Re-export base types
export {
    MockRestaurant,
    MockBusiness,
    MockMarket,
    MockSanctuary,
    MockServiceMethods,
    MockRestaurantService,
    MockBusinessService,
    MockMarketService,
    MockSanctuaryService
};

export interface MockUser {
    _id: string;
    username: string;
    email: string;
    role: 'user' | 'professional';
    isAdmin: boolean;
    isActive: boolean;
    isDeleted: boolean;
    photo: string;
    timestamps: {
        createdAt: Date;
        updatedAt: Date;
    };
}

export interface MockReview {
    _id: string;
    username: string;
    rating: number;
    comment: string;
    user: Types.ObjectId;
    refId: Types.ObjectId;
    refModel: string;
    timestamps: {
        createdAt: Date;
        updatedAt: Date;
    };
}

export interface MockPost {
    _id: string;
    title: string;
    content: string;
    author: Types.ObjectId;
    likes: {
        username: string;
        user: Types.ObjectId;
    }[];
    timestamps: {
        createdAt: Date;
        updatedAt: Date;
    };
}

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
}

// Type guards
export const isValidMockRestaurant = (obj: unknown): obj is MockRestaurant => {
    return obj !== null && typeof obj === 'object' && '_id' in obj && 'name' in obj;
};

export const isValidMockUser = (obj: unknown): obj is MockUser => {
    return obj !== null && typeof obj === 'object' && '_id' in obj && 'username' in obj;
};
