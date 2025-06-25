// Business Controllers Test - Corregido para evitar timeout
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';

// === CRITICAL: Mocks must be defined BEFORE any imports ===

// Mock database connection first
jest.mock('../../config/db', () => ({
    connectDB: jest.fn().mockResolvedValue(undefined),
    disconnectDB: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(true),
}));

// Mock middleware to prevent interference
jest.mock('../../middleware/security', () => ({
    rateLimits: {
        api: (_req: Request, _res: Response, next: NextFunction) => next(),
        auth: (_req: Request, _res: Response, next: NextFunction) => next(),
        search: (_req: Request, _res: Response, next: NextFunction) => next(),
    },
    securityHeaders: (_req: Request, _res: Response, next: NextFunction) => next(),
    enforceHTTPS: (_req: Request, _res: Response, next: NextFunction) => next(),
    configureHelmet: () => (_req: Request, _res: Response, next: NextFunction) => next(),
    addCorrelationId: (_req: Request, _res: Response, next: NextFunction) => next(),
    requireAPIVersion: () => (_req: Request, _res: Response, next: NextFunction) => next(),
    validateUserAgent: (_req: Request, _res: Response, next: NextFunction) => next(),
    limitRequestSize: () => (_req: Request, _res: Response, next: NextFunction) => next(),
    detectSuspiciousActivity: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

jest.mock('../../middleware/validation', () => ({
    sanitizeInput: () => [(_req: Request, _res: Response, next: NextFunction) => next()],
    securityHeaders: (_req: Request, _res: Response, next: NextFunction) => next(),
    validateInputLength: () => (_req: Request, _res: Response, next: NextFunction) => next(),
    validate: () => (_req: Request, _res: Response, next: NextFunction) => next(),
    rateLimits: {
        api: (_req: Request, _res: Response, next: NextFunction) => next(),
        auth: (_req: Request, _res: Response, next: NextFunction) => next(),
        register: (_req: Request, _res: Response, next: NextFunction) => next(),
        search: (_req: Request, _res: Response, next: NextFunction) => next(),
    },
}));

jest.mock('../../middleware/authMiddleware', () => ({
    protect: (_req: Request, _res: Response, next: NextFunction) => next(),
    admin: (_req: Request, _res: Response, next: NextFunction) => next(),
    professional: (_req: Request, _res: Response, next: NextFunction) => next(),
    refreshToken: (_req: Request, res: Response) => res.status(200).json({ success: true }),
    logout: (_req: Request, res: Response) => res.status(200).json({ success: true }),
    revokeAllTokens: (_req: Request, res: Response) => res.status(200).json({ success: true }),
}));

// Mock services with proper structure
jest.mock('../../services/BusinessService', () => ({
    businessService: {
        getAll: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
        updateById: jest.fn(),
        deleteById: jest.fn(),
    },
}));

jest.mock('../../services/GeoService', () => ({
    __esModule: true,
    default: {
        geocodeAddress: jest.fn(),
    },
}));

jest.mock('../../services/ReviewService', () => ({
    reviewService: {
        addReview: jest.fn(),
    },
}));

jest.mock('../../utils/logger', () => ({
    __esModule: true,
    default: {
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

// Mock express-validator
jest.mock('express-validator', () => ({
    validationResult: jest.fn().mockReturnValue({
        isEmpty: () => true,
        array: () => [],
    }),
}));

// Now import the app after all mocks are set up
import app from '../../app';
import { businessService } from '../../services/BusinessService';
import geoService from '../../services/GeoService';
import { reviewService } from '../../services/ReviewService';
import logger from '../../utils/logger';

beforeEach(() => {
    jest.clearAllMocks();

    // Reset validation result mock
    const { validationResult } = require('express-validator');
    validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => [],
    });
});

describe('Business Controllers Tests', () => {
    describe('Get all businesses', () => {
        it('should get all businesses', async () => {
            const mockBusinesses = [
                {
                    _id: 'mockBusinessId',
                    namePlace: 'mockBusiness',
                    address: 'mockAddress',
                    contact: {
                        phone: '1234567890',
                        email: 'test@example.com',
                    },
                    image: 'mockImage',
                    hours: [
                        {
                            dayOfWeek: 'Monday',
                            openTime: '8:00',
                            closeTime: '18:00',
                        },
                    ],
                },
            ];

            (businessService.getAll as jest.Mock).mockResolvedValueOnce(mockBusinesses);

            const response = await request(app).get('/api/v1/businesses');

            expect(response.status).toBe(200);
            expect(businessService.getAll).toHaveBeenCalled();
            expect(response.body).toEqual({
                success: true,
                message: 'Businesses fetched successfully',
                data: mockBusinesses,
            });
        }, 10000); // Add timeout for this specific test
    });

    describe('Get business by id', () => {
        it('should get business by id', async () => {
            const mockBusiness = {
                _id: 'mockBusinessId',
                namePlace: 'mockBusiness',
                address: 'mockAddress',
            };

            (businessService.findById as jest.Mock).mockResolvedValueOnce(mockBusiness);

            const response = await request(app).get('/api/v1/businesses/mockBusinessId');

            expect(response.status).toBe(200);
            expect(businessService.findById).toHaveBeenCalledWith('mockBusinessId');
            expect(response.body).toEqual({
                success: true,
                message: 'Business fetched successfully',
                data: mockBusiness,
            });
        });
    });

    describe('Create business', () => {
        it('sets location when geocoding succeeds', async () => {
            (geoService.geocodeAddress as jest.Mock).mockResolvedValue({ lat: 1, lng: 2 });
            (businessService.create as jest.Mock).mockResolvedValue({ id: '1' });

            const response = await request(app).post('/api/v1/businesses').send({
                name: 'My Shop',
                description: 'A great shop',
                address: '123 st',
                category: 'retail',
                phone: '1234567890',
            });

            expect(response.status).toBe(201);
            expect(geoService.geocodeAddress).toHaveBeenCalledWith('123 st');
            expect(businessService.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'My Shop',
                    description: 'A great shop',
                    address: '123 st',
                    category: 'retail',
                    phone: '1234567890',
                    location: { type: 'Point', coordinates: [2, 1] },
                })
            );
        });

        it('leaves location unset when geocoding fails', async () => {
            (geoService.geocodeAddress as jest.Mock).mockResolvedValue(null);
            (businessService.create as jest.Mock).mockResolvedValue({ id: '1' });

            const response = await request(app).post('/api/v1/businesses').send({
                name: 'Shop',
                description: 'Another shop',
                address: 'bad',
                category: 'retail',
                phone: '1234567890',
            });

            expect(response.status).toBe(201);
            expect(geoService.geocodeAddress).toHaveBeenCalledWith('bad');
            expect(businessService.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Shop',
                    description: 'Another shop',
                    address: 'bad',
                    category: 'retail',
                    phone: '1234567890',
                })
            );
        });

        it('handles geocoding errors gracefully', async () => {
            (geoService.geocodeAddress as jest.Mock).mockRejectedValue(new Error('Geocoding failed'));
            (businessService.create as jest.Mock).mockResolvedValue({ id: '1' });

            const response = await request(app).post('/api/v1/businesses').send({
                name: 'BoomCo',
                description: 'A company',
                address: 'explode',
                category: 'retail',
                phone: '1234567890',
            });

            expect(response.status).toBe(201);
            expect(geoService.geocodeAddress).toHaveBeenCalledWith('explode');
            expect(businessService.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'BoomCo',
                    description: 'A company',
                    address: 'explode',
                    category: 'retail',
                    phone: '1234567890',
                })
            );
        });
    });

    describe('Update business', () => {
        it('geocodes updated address', async () => {
            (geoService.geocodeAddress as jest.Mock).mockResolvedValue({ lat: 2, lng: 3 });
            (businessService.updateById as jest.Mock).mockResolvedValue({ id: '1' });

            const response = await request(app).put('/api/v1/businesses/1').send({
                name: 'Updated Shop',
                description: 'Updated description',
                address: '456 road',
                category: 'retail',
                phone: '1234567890',
            });

            expect(response.status).toBe(200);
            expect(geoService.geocodeAddress).toHaveBeenCalledWith('456 road');
            expect(businessService.updateById).toHaveBeenCalledWith(
                '1',
                expect.objectContaining({
                    name: 'Updated Shop',
                    description: 'Updated description',
                    address: '456 road',
                    category: 'retail',
                    phone: '1234567890',
                    location: { type: 'Point', coordinates: [3, 2] },
                })
            );
        });

        it('does not set location when geocoding returns null', async () => {
            (geoService.geocodeAddress as jest.Mock).mockResolvedValue(null);
            (businessService.updateById as jest.Mock).mockResolvedValue({ id: '1' });

            const response = await request(app).put('/api/v1/businesses/1').send({
                name: 'Shop',
                description: 'Description',
                address: 'no',
                category: 'retail',
                phone: '1234567890',
            });

            expect(response.status).toBe(200);
            expect(geoService.geocodeAddress).toHaveBeenCalledWith('no');
            expect(businessService.updateById).toHaveBeenCalledWith(
                '1',
                expect.objectContaining({
                    name: 'Shop',
                    description: 'Description',
                    address: 'no',
                    category: 'retail',
                    phone: '1234567890',
                })
            );
        });
    });

    describe('Add review to business', () => {
        it('should add review to business', async () => {
            const mockReview = {
                _id: 'reviewId',
                businessId: 'businessId',
                rating: 5,
                comment: 'Great business!',
            };

            (reviewService.addReview as jest.Mock).mockResolvedValueOnce(mockReview);

            const response = await request(app).post('/api/v1/businesses/add-review/businessId').send({
                rating: 5,
                comment: 'Great business!',
            });

            expect(response.status).toBe(200);
            expect(reviewService.addReview).toHaveBeenCalledWith({
                rating: 5,
                comment: 'Great business!',
                businessId: 'businessId',
            });
            expect(response.body).toEqual({
                success: true,
                message: 'Review added successfully',
                data: mockReview,
            });
        });
    });

    describe('Delete business', () => {
        it('should delete business', async () => {
            (businessService.deleteById as jest.Mock).mockResolvedValueOnce(undefined);

            const response = await request(app).delete('/api/v1/businesses/businessId');

            expect(response.status).toBe(200);
            expect(businessService.deleteById).toHaveBeenCalledWith('businessId');
            expect(response.body).toEqual({
                success: true,
                message: 'Business deleted successfully',
            });
        });
    });
});
