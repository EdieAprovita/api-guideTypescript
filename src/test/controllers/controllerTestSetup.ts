import { faker } from '@faker-js/faker';
import { jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

// Mock database connection BEFORE any imports
jest.mock('../../config/db', () => ({
    __esModule: true,
    default: jest.fn(),
}));

// Mock services
import geoService from '../../services/GeoService';

jest.mock('../../services/GeoService', () => ({
    __esModule: true,
    default: { geocodeAddress: jest.fn() },
}));

jest.mock('../../services/ReviewService', () => ({
    reviewService: {
        addReview: jest.fn(),
        getTopRatedReviews: jest.fn(),
    },
}));

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
                updatedAt: new Date()
            }
        } as any; // Temporary any for test mock
        next();
    },
    admin: (_req: Request, _res: Response, next: NextFunction) => next(),
    professional: (_req: Request, _res: Response, next: NextFunction) => next(),
};

beforeEach(() => {
    jest.clearAllMocks();
});

export { geoService };
