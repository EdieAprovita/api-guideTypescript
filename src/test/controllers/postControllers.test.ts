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
        req.user = { _id: 'user', role: 'admin' };
        next();
    },
    admin: (_req, _res, next) => next(),
    professional: (_req, _res, next) => next(),
    refreshToken: (_req, res) => res.status(200).json({ success: true }),
    logout: (_req, res) => res.status(200).json({ success: true }),
    revokeAllTokens: (_req, res) => res.status(200).json({ success: true }),
}));

import app from '../../app';
import { postService } from '../../services/PostService';

jest.mock('../../config/db');
jest.mock('../../services/PostService', () => ({
    postService: {
        getAll: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
        updateById: jest.fn(),
        deleteById: jest.fn(),
        addComment: jest.fn(),
        likePost: jest.fn(),
        unlikePost: jest.fn(),
    },
}));


describe('Post Controllers', () => {
    it('likes a post', async () => {
        (postService.likePost as jest.Mock).mockResolvedValue([]);

        const res = await request(app).post('/api/v1/posts/like/1').set('Authorization', 'Bearer mock-token');

        expect(res.status).toBe(200);
        expect(postService.likePost).toHaveBeenCalledWith('1', 'user');
    });

    it('gets posts', async () => {
        (postService.getAll as jest.Mock).mockResolvedValue([]);

        const res = await request(app).get('/api/v1/posts');

        expect(res.status).toBe(200);
        expect(postService.getAll).toHaveBeenCalled();
    });
});
