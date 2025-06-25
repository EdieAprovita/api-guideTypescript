import request from 'supertest';
import { geoService } from './controllerTestSetup';
import type { Request, Response, NextFunction } from 'express';
// Prevent database connection attempts when importing the app
jest.mock('../../config/db');
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
jest.mock('../../middleware/authMiddleware', () => ({
    protect: (_req: Request, _res: Response, next: NextFunction) => next(),
    admin: (_req: Request, _res: Response, next: NextFunction) => next(),
    professional: (_req: Request, _res: Response, next: NextFunction) => next(),
    refreshToken: (_req: Request, res: Response) => res.status(200).json({ success: true }),
    logout: (_req: Request, res: Response) => res.status(200).json({ success: true }),
    revokeAllTokens: (_req: Request, res: Response) => res.status(200).json({ success: true }),
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
import app from '../../app';
import { sanctuaryService } from '../../services/SanctuaryService';
import { reviewService } from '../../services/ReviewService';

jest.mock('../../services/SanctuaryService', () => ({
    sanctuaryService: {
        getAll: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
        updateById: jest.fn(),
        deleteById: jest.fn(),
    },
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

describe('Sanctuary Controllers', () => {
    it('creates a sanctuary with geocode', async () => {
        (geoService.geocodeAddress as jest.Mock).mockResolvedValue({ lat: 1, lng: 2 });
        (sanctuaryService.create as jest.Mock).mockResolvedValue({ id: '1' });

        await request(app).post('/api/v1/sanctuaries').send({ address: 'a' });

        expect(geoService.geocodeAddress).toHaveBeenCalledWith('a');
        expect(sanctuaryService.create).toHaveBeenCalledWith(
            expect.objectContaining({ address: 'a', location: { type: 'Point', coordinates: [2, 1] } })
        );
    });

    it('adds a review', async () => {
        (reviewService.addReview as jest.Mock).mockResolvedValue({ id: 'r' });
        const res = await request(app).post('/api/v1/sanctuaries/add-review/1').send({ text: 'good' });
        expect(res.status).toBe(200);
        expect(reviewService.addReview).toHaveBeenCalledWith({ text: 'good', sanctuaryId: '1' });
    });
});
