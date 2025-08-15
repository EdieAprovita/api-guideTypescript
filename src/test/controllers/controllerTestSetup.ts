import { faker } from '@faker-js/faker';
import { jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

// Mock database connection BEFORE any imports
vi.mock('../../config/db', () => ({
    __esModule: true,
    default: vi.fn(),
}));

// Mock services
import geoService from '../../services/GeoService';

vi.mock('../../services/GeoService', () => ({
    __esModule: true,
    default: { geocodeAddress: vi.fn() },
}));

vi.mock('../../services/ReviewService', () => ({
    reviewService: {
        addReview: vi.fn(),
        getTopRatedReviews: vi.fn(),
    },
}));

interface TestUser {
    _id: string;
    username: string;
    email: string;
    role: 'user' | 'professional' | 'admin';
    isAdmin: boolean;
    isActive: boolean;
    isDeleted: boolean;
    photo: string;
    timestamps: {
        createdAt: Date;
        updatedAt: Date;
    };
}

const mockAuthMiddleware = {
    protect: (req: Request, _res: Response, next: NextFunction) => {
        req.user = {
            _id: 'testUserId',
            username: 'testUser',
            email: faker.internet.email(),
            role: 'user',
            isAdmin: false,
            isActive: true,
            isDeleted: false,
            photo: 'default.jpg',
            timestamps: {
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        } as TestUser;
        next();
    },
    admin: (_req: Request, _res: Response, next: NextFunction) => next(),
    professional: (_req: Request, _res: Response, next: NextFunction) => next(),
};

beforeEach(() => {
    vi.clearAllMocks();
});

export { geoService };
