import request from 'supertest';
import { geoService } from './controllerTestSetup';
import { restaurantService } from '../../services/RestaurantService';
import { reviewService } from '../../services/ReviewService';
import { Request, Response, NextFunction } from 'express';
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
}));

jest.mock('../../services/RestaurantService', () => ({
    restaurantService: {
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

jest.mock('../../middleware/authMiddleware', () => ({
    protect: (_req, _res, next) => next(),
    admin: (_req, _res, next) => next(),
    professional: (_req, _res, next) => next(),
    refreshToken: (_req, res) => res.status(200).json({ success: true }),
    logout: (_req, res) => res.status(200).json({ success: true }),
    revokeAllTokens: (_req, res) => res.status(200).json({ success: true }),
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

jest.mock('../../middleware/security', () => ({
    securityHeaders: (_req, _res, next) => next(),
    enforceHTTPS: (_req, _res, next) => next(),
    configureHelmet: () => (_req, _res, next) => next(),
    addCorrelationId: (_req, _res, next) => next(),
    requireAPIVersion: () => (_req, _res, next) => next(),
    validateUserAgent: (_req, _res, next) => next(),
    limitRequestSize: () => (_req, _res, next) => next(),
    detectSuspiciousActivity: (_req, _res, next) => next(),
}));

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

describe('Restaurant Controllers', () => {
    it('gets restaurants', async () => {
        (restaurantService.getAll as jest.Mock).mockResolvedValue([]);
        const res = await request(app).get('/api/v1/restaurants');
        expect(res.status).toBe(200);
        expect(restaurantService.getAll).toHaveBeenCalled();
    });

    it('updates a restaurant', async () => {
        (geoService.geocodeAddress as jest.Mock).mockResolvedValue({ lat: 2, lng: 3 });
        (restaurantService.updateById as jest.Mock).mockResolvedValue({ id: '1' });

        await request(app).put('/api/v1/restaurants/1').send({ address: 'b' });

        expect(geoService.geocodeAddress).toHaveBeenCalledWith('b');
        expect(restaurantService.updateById).toHaveBeenCalledWith(
            '1',
            expect.objectContaining({ address: 'b', location: { type: 'Point', coordinates: [3, 2] } })
        );
    });

    it('creates a restaurant', async () => {
        (geoService.geocodeAddress as jest.Mock).mockResolvedValue({ lat: 1, lng: 2 });
        (restaurantService.create as jest.Mock).mockResolvedValue({ id: '1' });

        await request(app).post('/api/v1/restaurants').send({ address: 'a' });

        expect(geoService.geocodeAddress).toHaveBeenCalledWith('a');
        expect(restaurantService.create).toHaveBeenCalledWith(
            expect.objectContaining({ address: 'a', location: { type: 'Point', coordinates: [2, 1] } })
        );
    });

    it('adds a review', async () => {
        (reviewService.addReview as jest.Mock).mockResolvedValue({ id: 'r' });

        const res = await request(app).post('/api/v1/restaurants/add-review/1').send({ text: 'good' });

        expect(res.status).toBe(200);
        expect(reviewService.addReview).toHaveBeenCalledWith({ text: 'good', restaurantId: '1' });
    });

    it('deletes a restaurant', async () => {
        (restaurantService.deleteById as jest.Mock).mockResolvedValue(undefined);

        const res = await request(app).delete('/api/v1/restaurants/1');

        expect(res.status).toBe(200);
        expect(restaurantService.deleteById).toHaveBeenCalledWith('1');
    });

    it('gets top rated restaurants', async () => {
        (reviewService.getTopRatedReviews as jest.Mock).mockResolvedValue([
            { id: '1', rating: 5 },
            { id: '2', rating: 4.8 },
        ]);

        const res = await request(app).get('/api/v1/restaurants/top-rated');

        expect(res.status).toBe(200);
        expect(reviewService.getTopRatedReviews).toHaveBeenCalledWith('restaurant');
    });
});
