import request from 'supertest';
import { geoService } from './controllerTestSetup';
import type { Request, Response, NextFunction } from 'express';
jest.resetModules();
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

jest.mock('../../controllers/restaurantControllers', () => ({
    getRestaurants: (_req, res) => res.status(200).json({ success: true }),
    getRestaurantById: (_req, res) => res.status(200).json({ success: true }),
    createRestaurant: (_req, res) => res.status(201).json({ success: true }),
    updateRestaurant: (_req, res) => res.status(200).json({ success: true }),
    addReviewToRestaurant: (_req, res) => res.status(200).json({ success: true }),
    deleteRestaurant: (_req, res) => res.status(200).json({ success: true }),
    getTopRatedRestaurants: (_req, res) => res.status(200).json({ success: true }),
}));

import app from '../../app';
import { recipeService } from '../../services/RecipesService';
import { reviewService } from '../../services/ReviewService';

jest.mock('../../services/RecipesService', () => ({
    recipeService: {
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

describe('Recipes Controllers', () => {
    it('lists recipes', async () => {
        (recipeService.getAll as jest.Mock).mockResolvedValue([]);
        const res = await request(app).get('/api/v1/recipes');
        expect(res.status).toBe(200);
        expect(recipeService.getAll).toHaveBeenCalled();
    });
});
