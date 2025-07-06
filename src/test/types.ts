import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';

// Tipos específicos para testing
export interface TestUser {
    _id: string;
    role: string;
    email?: string;
}

// Mock data types that avoid Mongoose Document interface requirements
export interface MockRestaurant {
    _id: string;
    name: string;
    description: string;
    address: string;
    location: {
        type: string;
        coordinates: [number, number];
    };
    contact: {
        phone?: string;
        email?: string;
        website?: string;
    }[];
    cuisine: string;
    reviews: {
        _id: string;
        rating: number;
        comment: string;
        username: string;
    }[];
    rating: number;
    isVerified: boolean;
}

export interface MockBusiness {
    _id: string;
    name: string;
    description: string;
    address: string;
    location: {
        type: string;
        coordinates: [number, number];
    };
    contact: {
        phone?: string;
        email?: string;
        website?: string;
    }[];
    category: string;
    reviews: {
        _id: string;
        rating: number;
        comment: string;
        username: string;
    }[];
    rating: number;
    isVerified: boolean;
}

export interface MockMarket {
    _id: string;
    name: string;
    description: string;
    address: string;
    location: {
        type: string;
        coordinates: [number, number];
    };
    contact: {
        phone?: string;
        email?: string;
        website?: string;
    }[];
    reviews: {
        _id: string;
        rating: number;
        comment: string;
        username: string;
    }[];
    rating: number;
    isVerified: boolean;
}

export interface MockSanctuary {
    _id: string;
    name: string;
    description: string;
    address: string;
    location: {
        type: string;
        coordinates: [number, number];
    };
    animals: {
        type: string;
        count: number;
        description?: string;
    }[];
    website: string;
    contact: {
        phone?: string;
        email?: string;
        website?: string;
    }[];
    reviews: {
        _id: string;
        rating: number;
        comment: string;
        username: string;
    }[];
    rating: number;
    isVerified: boolean;
}

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
export interface MockDoctorService extends MockServiceMethods<MockBusiness> {}
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

// Type guards para validación de tipos
export const isValidMockRestaurant = (obj: unknown): obj is MockRestaurant => {
    return typeof obj === 'object' && obj !== null && 
           '_id' in obj && 'name' in obj && 'location' in obj;
};

export const isValidMockUser = (obj: unknown): obj is MockUser => {
    return typeof obj === 'object' && obj !== null && 
           '_id' in obj && 'username' in obj && 'email' in obj;
};
