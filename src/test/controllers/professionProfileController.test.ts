import request from 'supertest';
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
import { professionProfileService } from '../../services/ProfessionProfileService';

jest.mock('../../services/ProfessionProfileService', () => ({
    professionProfileService: {
        getAll: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
        updateById: jest.fn(),
        deleteById: jest.fn(),
    },
}));

describe('ProfessionProfile Controllers', () => {
    it('lists profession profiles', async () => {
        (professionProfileService.getAll as jest.Mock).mockResolvedValue([]);
        const res = await request(app).get('/api/v1/professionalProfile');
        expect(res.status).toBe(200);
        expect(professionProfileService.getAll).toHaveBeenCalled();
    });

    it('deletes a profession profile', async () => {
        (professionProfileService.deleteById as jest.Mock).mockResolvedValue(undefined);
        const res = await request(app).delete('/api/v1/professionalProfile/1');
        expect(res.status).toBe(200);
        expect(professionProfileService.deleteById).toHaveBeenCalledWith('1');
    });
});
