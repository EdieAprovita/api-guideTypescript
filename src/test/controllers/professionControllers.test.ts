import request from 'supertest';
import { geoService } from './controllerTestSetup';
import type { Request, Response, NextFunction } from 'express';
jest.resetModules();
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

jest.mock('../../middleware/security', () => ({
    securityHeaders: (_req: Request, _res: Response, next: NextFunction) => next(),
    enforceHTTPS: (_req: Request, _res: Response, next: NextFunction) => next(),
    configureHelmet: () => (_req: Request, _res: Response, next: NextFunction) => next(),
    addCorrelationId: (_req: Request, _res: Response, next: NextFunction) => next(),
    requireAPIVersion: () => (_req: Request, _res: Response, next: NextFunction) => next(),
    validateUserAgent: (_req: Request, _res: Response, next: NextFunction) => next(),
    limitRequestSize: () => (_req: Request, _res: Response, next: NextFunction) => next(),
    detectSuspiciousActivity: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

jest.mock('../../middleware/authMiddleware', () => ({
    protect: (req, res, next) => {
        req.user = { id: 'user', role: 'admin' };
        next();
    },
    admin: (req, res, next) => next(),
    professional: (req, res, next) => next(),
    refreshToken: (_req, res) => res.status(200).json({ success: true }),
    logout: (_req, res) => res.status(200).json({ success: true }),
    revokeAllTokens: (_req, res) => res.status(200).json({ success: true }),
}));

import app from '../../app';
import { professionService } from '../../services/ProfessionService';
import { reviewService } from '../../services/ReviewService';

jest.mock('../../services/ProfessionService', () => ({
    professionService: {
        getAll: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
        updateById: jest.fn(),
        deleteById: jest.fn(),
    },
}));

jest.mock('../../services/ReviewService', () => ({
    reviewService: {
        addReview: jest.fn(),
        getTopRatedReviews: jest.fn(),
    },
}));

describe('Profession Controllers', () => {
    it('gets professions', async () => {
        (professionService.getAll as jest.Mock).mockResolvedValue([]);
        const res = await request(app).get('/api/v1/professions');
        expect(res.status).toBe(200);
        expect(professionService.getAll).toHaveBeenCalled();
    });
});
