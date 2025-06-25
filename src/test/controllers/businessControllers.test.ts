import request from 'supertest';
// Prevent database connection attempts when importing the app
jest.mock('../../config/db');
import type { Request, Response, NextFunction } from 'express';
jest.resetModules();
jest.mock('../../middleware/security', () => ({
    rateLimits: {
        api: (_req, _res, next) => next(),
        auth: (_req, _res, next) => next(),
        search: (_req, _res, next) => next(),
    },
    securityHeaders: (_req, _res, next) => next(),
    enforceHTTPS: (_req, _res, next) => next(),
    configureHelmet: () => (_req, _res, next) => next(),
    addCorrelationId: (_req, _res, next) => next(),
    requireAPIVersion: () => (_req, _res, next) => next(),
    validateUserAgent: (_req, _res, next) => next(),
    limitRequestSize: () => (_req, _res, next) => next(),
    detectSuspiciousActivity: (_req, _res, next) => next(),
}));

jest.mock('../../middleware/validation', () => ({
    sanitizeInput: () => [(_req, _res, next) => next()],
    securityHeaders: (_req, _res, next) => next(),
    validateInputLength: () => (_req, _res, next) => next(),
    validate: () => (_req, _res, next) => next(),
    rateLimits: {
        api: (_req, _res, next) => next(),
        auth: (_req, _res, next) => next(),
        register: (_req, _res, next) => next(),
        search: (_req, _res, next) => next(),
    },
}));

jest.mock('../../middleware/authMiddleware', () => ({
    protect: (_req, _res, next) => next(),
    admin: (_req, _res, next) => next(),
    professional: (_req, _res, next) => next(),
    refreshToken: (_req, res) => res.status(200).json({ success: true }),
    logout: (_req, res) => res.status(200).json({ success: true }),
    revokeAllTokens: (_req, res) => res.status(200).json({ success: true }),
}));

import app from '../../app';
import { businessService } from '../../services/BusinessService';
import geoService from '../../services/GeoService';
import logger from '../../utils/logger';

jest.mock('../../services/GeoService', () => ({
    __esModule: true,
    default: { geocodeAddress: jest.fn() },
}));

jest.mock('../../utils/logger', () => ({
    __esModule: true,
    default: { error: jest.fn() },
}));

jest.mock('../../services/BusinessService', () => ({
    businessService: {
        getAll: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
        updateById: jest.fn(),
        deleteById: jest.fn(),
    },
}));

beforeEach(() => {
    jest.clearAllMocks();
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
        });
    });

    describe('Get business by id', () => {
        it('should get business by id', async () => {
            const response = await request(app).get('/api/v1/businesses/mockBusinessId');

            expect(response.status).toBe(200);
            expect(businessService.findById).toHaveBeenCalledWith('mockBusinessId');
        });
    });

    describe('Create business', () => {
        it('sets location when geocoding succeeds', async () => {
            (geoService.geocodeAddress as jest.Mock).mockResolvedValue({ lat: 1, lng: 2 });
            (businessService.create as jest.Mock).mockResolvedValue({ id: '1' });

            await request(app).post('/api/v1/businesses').send({
                name: 'My Shop',
                description: 'A great shop',
                address: '123 st',
                category: 'retail',
                phone: '1234567890',
            });

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

            await request(app).post('/api/v1/businesses').send({
                name: 'Shop',
                description: 'Another shop',
                address: 'bad',
                category: 'retail',
                phone: '1234567890',
            });

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

            await request(app).post('/api/v1/businesses').send({
                name: 'BoomCo',
                description: 'A company',
                address: 'explode',
                category: 'retail',
                phone: '1234567890',
            });

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

            await request(app).put('/api/v1/businesses/1').send({
                name: 'Updated Shop',
                description: 'Updated description',
                address: '456 road',
                category: 'retail',
                phone: '1234567890',
            });

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

            await request(app).put('/api/v1/businesses/1').send({
                name: 'Shop',
                description: 'Description',
                address: 'no',
                category: 'retail',
                phone: '1234567890',
            });

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
});
