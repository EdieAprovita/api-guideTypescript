import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';

// Extract common types
export interface BusinessHours {
    [day: string]: {
        open: string;
        close: string;
        closed: boolean;
    };
}

export interface TestUser {
    _id: Types.ObjectId;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    password: string;
    role: string;
    isVerified: boolean;
}

// Update TestRestaurant
export interface TestRestaurant {
    _id?: Types.ObjectId;
    restaurantName: string;
    description: string;
    address: string;
    location: {
        type: 'Point';
        coordinates: [number, number];
    };
    cuisine: string[];
    features: string[];
    author: string | Types.ObjectId;
    contact: Array<{ phone: string; facebook: string; instagram: string }>;
    rating: number;
    numReviews: number;
    reviews: any[];
}

// Update TestBusiness
export interface TestBusiness {
    _id?: Types.ObjectId;
    name: string;
    description: string;
    phone: string;
    email: string;
    website?: string;
    address: string;
    location: {
        type: 'Point';
        coordinates: [number, number];
    };
    category: string;
    subcategory?: string;
    owner: string | Types.ObjectId;
    status: 'pending' | 'approved' | 'rejected';
    businessHours: BusinessHours;
    features: string[];
}

export interface TestReview {
    _id?: Types.ObjectId;
    rating: number;
    title: string;
    content: string;
    visitDate: Date;
    recommendedDishes?: string[];
    tags?: string[];
    author: string | Types.ObjectId;
    restaurant: string | Types.ObjectId;
    helpfulCount?: number;
}

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        role: string;
    };
}

export interface TestResponse {
    success: boolean;
    data?: unknown;
    error?: string;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export interface CacheStats {
    hitRatio: number;
    totalHits: number;
    totalMisses: number;
    totalKeys: number;
    memoryUsage: string;
    responseTime: number;
}

export interface CacheHealth {
    status: 'healthy' | 'unhealthy';
    connected: boolean;
    uptime: number;
    version: string;
}

export interface AlertConfig {
    thresholds: {
        hitRatio: number;
        memoryUsage: number;
        responseTime: number;
    };
    enabled: boolean;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface TestEndpoint {
    method: HttpMethod;
    path: string;
    requiresAuth: boolean;
    requiresAdmin?: boolean;
}

export interface ValidationTestCase {
    name: string;
    data: Record<string, unknown>;
    expectedStatus: number;
    expectedErrorField?: string;
}

export interface AuthTestCase {
    name: string;
    token?: string;
    expectedStatus: number;
}

export interface MockMiddleware {
    (req: AuthenticatedRequest, res: Response, next: NextFunction): void;
}

export interface TestConstants {
    readonly FAKE_OBJECT_ID: string;
    readonly TEST_TIMEOUT: number;
    readonly VALID_COORDINATES: readonly [number, number];
    readonly INVALID_COORDINATES: readonly [number, number];
    readonly DEFAULT_PAGE_SIZE: number;
}

export interface LocationSearchParams {
    lat: number;
    lng: number;
    radius: number;
}

export interface PaginationParams {
    page: number;
    limit: number;
}

export interface SortParams {
    field: string;
    direction: 'asc' | 'desc';
}

export interface SearchParams {
    search: string;
}

export interface FilterParams {
    [key: string]: string | number | boolean;
}

export interface PopulatedReview {
    author: {
        firstName: string;
        lastName: string;
    };
}

// Update testDataFactory with default schedule
const defaultBusinessHours: BusinessHours = {
    monday: { open: '10:00', close: '20:00', closed: false },
    tuesday: { open: '10:00', close: '20:00', closed: false },
    wednesday: { open: '10:00', close: '20:00', closed: false },
    thursday: { open: '10:00', close: '20:00', closed: false },
    friday: { open: '10:00', close: '20:00', closed: false },
    saturday: { open: '10:00', close: '20:00', closed: false },
    sunday: { open: '10:00', close: '20:00', closed: false }
};

export const testDataFactory = {
    restaurant: (): TestRestaurant => ({
        restaurantName: 'Test Restaurant',
        description: 'Test restaurant description',
        address: '456 Test Street, Test City, Test State, USA, 12345',
        location: {
            type: 'Point',
            coordinates: [-118.2437, 34.0522]
        },
        cuisine: ['vegan'],
        features: ['delivery'],
        author: '', // Se setea en el test
        contact: [
            {
                phone: '+1-555-999-0000',
                facebook: '',
                instagram: ''
            }
        ],
        rating: 0,
        numReviews: 0,
        reviews: []
    }),

    business: (): TestBusiness => ({
        name: 'Test Business',
        description: 'Test business description',
        category: 'restaurant',
        phone: '+1-555-123-4567',
        email: 'test@business.com',
        website: 'https://testbusiness.com',
        address: '123 Business Street, Business City, Business State, USA, 54321',
        location: {
            type: 'Point',
            coordinates: [-118.2437, 34.0522]
        },
        owner: '',
        status: 'pending',
        features: ['delivery', 'outdoor-seating'],
        businessHours: {
            ...defaultBusinessHours,
            friday: { open: '09:00', close: '22:00', closed: false },
            saturday: { open: '09:00', close: '22:00', closed: false },
            sunday: { open: '10:00', close: '20:00', closed: false }
        }
    }),

    review: (): Omit<TestReview, 'author' | 'restaurant'> => ({
        rating: 5,
        title: 'Amazing experience!',
        content: 'The service was absolutely excellent. Great variety of options and outstanding service. Highly recommended!',
        visitDate: new Date('2024-06-01'),
        recommendedDishes: ['Signature Dish', 'Special Salad'],
        tags: ['family-friendly', 'great-service', 'outdoor-seating']
    })
};