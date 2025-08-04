import { Types } from 'mongoose';
import { MockedFunction } from 'vitest';

// Base interfaces to reduce duplication
export interface BaseLocation {
    type: string;
    coordinates: [number, number];
}

export interface BaseContact {
    phone?: string;
    email?: string;
    website?: string;
}

export interface BaseReview {
    _id: string;
    rating: number;
    comment: string;
    username: string;
}

export interface BaseMockEntity {
    _id: string;
    name: string;
    description: string;
    address: string;
    location: BaseLocation;
    contact: BaseContact[];
    reviews: BaseReview[];
    rating: number;
    isVerified: boolean;
}

// Specific entity interfaces extending base
export interface MockRestaurant extends BaseMockEntity {
    cuisine: string;
}

export interface MockBusiness extends BaseMockEntity {
    namePlace: string;
    typeBusiness: string;
}

export interface MockMarket extends BaseMockEntity {}

export interface MockSanctuary extends BaseMockEntity {
    animals: {
        type: string;
        count: number;
        description?: string;
    }[];
    website: string;
}

// Service mock base interface
export interface MockServiceMethods<T> {
    getAll: MockedFunction<() => Promise<T[]>>;
    getAllCached: MockedFunction<() => Promise<T[]>>;
    findById: MockedFunction<(id: string) => Promise<T | null>>;
    findByIdCached: MockedFunction<(id: string) => Promise<T | null>>;
    create: MockedFunction<(data: Partial<T>) => Promise<T>>;
    createCached: MockedFunction<(data: Partial<T>) => Promise<T>>;
    updateById: MockedFunction<(id: string, data: Partial<T>) => Promise<T | null>>;
    updateByIdCached: MockedFunction<(id: string, data: Partial<T>) => Promise<T | null>>;
    deleteById: MockedFunction<(id: string) => Promise<void>>;
}

// Specific service interfaces
export interface MockRestaurantService extends MockServiceMethods<MockRestaurant> {}
export interface MockBusinessService extends MockServiceMethods<MockBusiness> {}
export interface MockMarketService extends MockServiceMethods<MockMarket> {}
export interface MockSanctuaryService extends MockServiceMethods<MockSanctuary> {}
