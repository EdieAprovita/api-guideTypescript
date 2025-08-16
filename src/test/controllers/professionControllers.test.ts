import { vi, describe, it, beforeEach, expect } from 'vitest';
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';

// === CRITICAL: Mocks must be defined BEFORE any imports ===
// Mock express-validator
vi.mock('express-validator', () => ({
    validationResult: vi.fn(() => ({
        isEmpty: () => true,
        array: () => [],
    })),
}));

// Mock authMiddleware
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

// Mock asyncHandler
vi.mock('../../middleware/asyncHandler', () => ({
    default: (fn: Function) => fn,
}));

// Mock types
vi.mock('../../types/modalTypes', () => ({
    getErrorMessage: (message: string) => message,
}));

// Mock database
vi.mock('../../config/db', () => ({
    connectDB: vi.fn().mockResolvedValue(undefined),
    disconnectDB: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
    __esModule: true,
    default: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

// Mock services with proper structure
vi.mock('../../services/ProfessionService', () => ({
    professionService: {
        getAll: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
        updateById: vi.fn(),
        deleteById: vi.fn(),
    },
}));

vi.mock('../../services/ReviewService', () => ({
    reviewService: {
        addReview: vi.fn(),
        getTopRatedReviews: vi.fn(),
    },
}));

// Now import the app after all mocks are set up
import app from '../../app';
import { professionService } from '../../services/ProfessionService';
import { reviewService } from '../../services/ReviewService';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('Profession Controllers', () => {
    describe('Get all professions', () => {
        it('should get all professions', async () => {
            const mockProfessions = [
                { _id: 'prof1', name: 'Doctor', description: 'Medical professional' },
                { _id: 'prof2', name: 'Engineer', description: 'Technical professional' },
            ];

            (professionService.getAll as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockProfessions);

            const response = await request(app).get('/api/v1/professions');

            expect(response.status).toBe(200);
            expect(professionService.getAll).toHaveBeenCalled();
            expect(response.body).toEqual({
                success: true,
                message: 'Professions fetched successfully',
                data: mockProfessions,
            });
        });
    });

    describe('Get profession by id', () => {
        it('should get profession by id', async () => {
            const mockProfession = { _id: 'prof1', name: 'Doctor', description: 'Medical professional' };

            (professionService.findById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockProfession);

            const response = await request(app).get(`/api/v1/professions/${mockProfession._id}`);

            expect(response.status).toBe(200);
            expect(professionService.findById).toHaveBeenCalledWith(mockProfession._id);
            expect(response.body).toEqual({
                success: true,
                message: 'Profession fetched successfully',
                data: mockProfession,
            });
        });
    });

    describe('Create profession', () => {
        it('should create a new profession', async () => {
            const professionData = {
                name: 'New Profession',
                description: 'A new professional field',
                requirements: ['degree', 'certification'],
            };

            const createdProfession = { ...professionData, _id: 'prof123' };
            (professionService.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(createdProfession);

            const response = await request(app).post('/api/v1/professions').send(professionData);

            expect(response.status).toBe(201);
            expect(professionService.create).toHaveBeenCalledWith(professionData);
            expect(response.body).toEqual({
                success: true,
                message: 'Profession created successfully',
                data: createdProfession,
            });
        });
    });

    describe('Update profession', () => {
        it('should update profession by id', async () => {
            const professionId = 'prof123';
            const updateData = {
                name: 'Updated Profession',
                description: 'Updated description',
            };

            const updatedProfession = { ...updateData, _id: professionId };
            (professionService.updateById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(updatedProfession);

            const response = await request(app).put(`/api/v1/professions/${professionId}`).send(updateData);

            expect(response.status).toBe(200);
            expect(professionService.updateById).toHaveBeenCalledWith(professionId, updateData);
            expect(response.body).toEqual({
                success: true,
                message: 'Profession updated successfully',
                data: updatedProfession,
            });
        });
    });

    describe('Delete profession', () => {
        it('should delete profession by id', async () => {
            const professionId = 'prof123';

            (professionService.deleteById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

            const response = await request(app).delete(`/api/v1/professions/${professionId}`);

            expect(response.status).toBe(200);
            expect(professionService.deleteById).toHaveBeenCalledWith(professionId);
            expect(response.body).toEqual({
                success: true,
                message: 'Profession deleted successfully',
            });
        });
    });
});
