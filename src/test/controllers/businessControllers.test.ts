import { vi, describe, it, beforeEach, expect } from 'vitest';
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';

// === MOCKS FIRST ===
vi.mock('express-validator', () => ({
    validationResult: vi.fn(() => ({
        isEmpty: () => true,
        array: () => [],
    })),
}));

vi.mock('../../middleware/authMiddleware', () => ({
    protect: (req: Request, _res: Response, next: NextFunction) => {
        req.user = { _id: 'user123', role: 'admin' };
        next();
    },
    admin: (_req: Request, _res: Response, next: NextFunction) => next(),
    professional: (_req: Request, _res: Response, next: NextFunction) => next(),
    refreshToken: (_req: Request, res: Response) => res.status(200).json({ success: true }),
    logout: (_req: Request, res: Response) => res.status(200).json({ success: true }),
    revokeAllTokens: (_req: Request, res: Response) => res.status(200).json({ success: true }),
}));

vi.mock('../../middleware/asyncHandler', () => ({
    default: (fn: Function) => fn,
}));

vi.mock('../../types/modalTypes', () => ({
    getErrorMessage: (message: string) => message,
}));

vi.mock('../../config/db', () => ({
    connectDB: vi.fn().mockResolvedValue(undefined),
    disconnectDB: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
}));

vi.mock('../../utils/logger', () => ({
    __esModule: true,
    default: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

// Simplified service mocks
vi.mock('../../services/BusinessService', () => ({
    businessService: {
        getAllCached: vi.fn(),
        findByIdCached: vi.fn(),
        create: vi.fn(),
        updateById: vi.fn(),
        deleteById: vi.fn(),
    },
}));

vi.mock('../../services/ReviewService', () => ({
    reviewService: {
        addReview: vi.fn(),
    },
}));

import app from '../../app';
import { businessService } from '../../services/BusinessService';
import { reviewService } from '../../services/ReviewService';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('Business Controllers Tests', () => {
    describe('Get all businesses', () => {
        it('should get all businesses', async () => {
            const mockBusinesses = [
                { _id: 'business1', name: 'Test Business', address: 'Test Address' }
            ];

            (businessService.getAllCached as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockBusinesses);

            const response = await request(app).get('/api/v1/businesses');

            expect(response.status).toBe(200);
            expect(businessService.getAllCached).toHaveBeenCalled();
            expect(response.body).toEqual({
                success: true,
                message: 'Businesses fetched successfully',
                data: mockBusinesses,
            });
        });
    });

    describe('Get business by id', () => {
        it('should get business by id', async () => {
            const mockBusiness = { _id: 'business1', name: 'Test Business', address: 'Test Address' };

            (businessService.findByIdCached as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockBusiness);

            const response = await request(app).get('/api/v1/businesses/business1');

            expect(response.status).toBe(200);
            expect(businessService.findByIdCached).toHaveBeenCalledWith('business1');
            expect(response.body).toEqual({
                success: true,
                message: 'Business fetched successfully',
                data: mockBusiness,
            });
        });
    });

    describe('Create business', () => {
        it('should create a new business', async () => {
            const businessData = {
                name: 'My Shop',
                description: 'A great shop',
                address: '123 Main St',
                category: 'retail',
                phoneNumber: '+1234567890',
            };

            const createdBusiness = { ...businessData, _id: 'business123' };
            (businessService.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(createdBusiness);

            const response = await request(app).post('/api/v1/businesses').send(businessData);

            expect(response.status).toBe(201);
            expect(businessService.create).toHaveBeenCalledWith(
                expect.objectContaining(businessData)
            );
            expect(response.body).toEqual({
                success: true,
                message: 'Business created successfully',
                data: createdBusiness,
            });
        });
    });

    describe('Update business', () => {
        it('should update business by id', async () => {
            const businessId = 'business123';
            const updateData = {
                name: 'Updated Shop',
                description: 'Updated description',
            };

            const updatedBusiness = { ...updateData, _id: businessId };
            (businessService.updateById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(updatedBusiness);

            const response = await request(app).put(`/api/v1/businesses/${businessId}`).send(updateData);

            expect(response.status).toBe(200);
            expect(businessService.updateById).toHaveBeenCalledWith(
                businessId,
                expect.objectContaining(updateData)
            );
            expect(response.body).toEqual({
                success: true,
                message: 'Business updated successfully',
                data: updatedBusiness,
            });
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

            (reviewService.addReview as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockReview);

            const reviewData = {
                rating: 5,
                comment: 'Great business!',
            };

            const response = await request(app).post('/api/v1/businesses/add-review/businessId').send(reviewData);

            expect(response.status).toBe(200);
            expect(reviewService.addReview).toHaveBeenCalledWith({
                ...reviewData,
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
            (businessService.deleteById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

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
