import request from 'supertest';
import { geoService } from './controllerTestSetup';
import type { Request, Response, NextFunction } from 'express';
// Prevent database connection attempts when importing the app
jest.mock('../../config/db');
jest.resetModules();
jest.mock('../../middleware/authMiddleware', () => ({
    protect: (_req: Request, _res: Response, next: NextFunction) => next(),
    admin: (_req: Request, _res: Response, next: NextFunction) => next(),
    professional: (_req: Request, _res: Response, next: NextFunction) => next(),
    refreshToken: (_req: Request, res: Response) => res.status(200).json({ success: true }),
    logout: (_req: Request, res: Response) => res.status(200).json({ success: true }),
    revokeAllTokens: (_req: Request, res: Response) => res.status(200).json({ success: true }),
}));
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

// Mock controllers de auth que se usan en authRoutes
jest.mock('../../controllers/userControllers', () => ({
    refreshToken: (_req, res) => res.status(200).json({ success: true }),
    logout: (_req, res) => res.status(200).json({ success: true }),
    revokeAllTokens: (_req, res) => res.status(200).json({ success: true }),
    registerUser: (_req, res) => res.status(201).json({ success: true }),
    loginUser: (_req, res) => res.status(200).json({ success: true }),
    forgotPassword: (_req, res) => res.status(200).json({ success: true }),
    resetPassword: (_req, res) => res.status(200).json({ success: true }),
    getUsers: (_req, res) => res.status(200).json({ success: true }),
    getUserById: (_req, res) => res.status(200).json({ success: true }),
    updateUserProfile: (_req, res) => res.status(200).json({ success: true }),
    getCurrentUserProfile: (_req, res) => res.status(200).json({ success: true }),
    deleteUserById: (_req, res) => res.status(200).json({ success: true }),
}));

import app from '../../app';
import { marketsService } from '../../services/MarketsService';
import { reviewService } from '../../services/ReviewService';

jest.mock('../../services/MarketsService', () => ({
    marketsService: {
        getAll: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
        updateById: jest.fn(),
        deleteById: jest.fn(),
    },
}));

describe('Markets Controllers', () => {
    it('gets all markets', async () => {
        (marketsService.getAll as jest.Mock).mockResolvedValue([]);

        const res = await request(app).get('/api/v1/markets');

        expect(res.status).toBe(200);
        expect(marketsService.getAll).toHaveBeenCalled();
    });

    it('creates a market with geocode', async () => {
        (geoService.geocodeAddress as jest.Mock).mockResolvedValue({ lat: 1, lng: 2 });
        (marketsService.create as jest.Mock).mockResolvedValue({ id: '1' });

        await request(app).post('/api/v1/markets/create').send({ address: 'a' });

        expect(geoService.geocodeAddress).toHaveBeenCalledWith('a');
        expect(marketsService.create).toHaveBeenCalledWith(
            expect.objectContaining({
                address: 'a',
                location: { type: 'Point', coordinates: [2, 1] },
            })
        );
    });

    it('adds a review', async () => {
        (reviewService.addReview as jest.Mock).mockResolvedValue({ id: 'r' });

        const res = await request(app).post('/api/v1/markets/add-review/1').send({ text: 'good' });

        expect(res.status).toBe(200);
        expect(reviewService.addReview).toHaveBeenCalledWith({ text: 'good', marketId: '1' });
    });

    it('updates a market', async () => {
        (geoService.geocodeAddress as jest.Mock).mockResolvedValue({ lat: 3, lng: 4 });
        (marketsService.updateById as jest.Mock).mockResolvedValue({ id: '1' });

        await request(app).put('/api/v1/markets/update/1').send({ address: 'b' });

        expect(geoService.geocodeAddress).toHaveBeenCalledWith('b');
        expect(marketsService.updateById).toHaveBeenCalledWith(
            '1',
            expect.objectContaining({ address: 'b', location: { type: 'Point', coordinates: [4, 3] } })
        );
    });

    it('deletes a market', async () => {
        (marketsService.deleteById as jest.Mock).mockResolvedValue(undefined);

        const res = await request(app).delete('/api/v1/markets/delete/1');

        expect(res.status).toBe(200);
        expect(marketsService.deleteById).toHaveBeenCalledWith('1');
    });
});
