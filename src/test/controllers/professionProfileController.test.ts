import { vi, describe, it, beforeEach, expect } from 'vitest';
import { faker } from '@faker-js/faker';
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
vi.mock('../../services/ProfessionProfileService', () => ({
    professionProfileService: {
        getAll: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
        updateById: vi.fn(),
        deleteById: vi.fn(),
    },
}));

// Now import the app after all mocks are set up
import app from '../../app';
import { professionProfileService } from '../../services/ProfessionProfileService';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('ProfessionProfile Controllers', () => {
    describe('Get all profession profiles', () => {
        it('should get all profession profiles', async () => {
            const mockProfiles = [
                { _id: 'profile1', userId: faker.database.mongodbObjectId(), profession: 'Doctor', experience: 5 },
                { _id: 'profile2', userId: faker.database.mongodbObjectId(), profession: 'Engineer', experience: 3 },
            ];

            (professionProfileService.getAll as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockProfiles);

            const response = await request(app).get('/api/v1/professionalProfile');

            expect(response.status).toBe(200);
            expect(professionProfileService.getAll).toHaveBeenCalled();
            expect(response.body).toEqual({
                success: true,
                message: 'Professions fetched successfully',
                data: mockProfiles,
            });
        });
    });

    describe('Get profession profile by id', () => {
        it('should get profession profile by id', async () => {
            const mockProfile = { _id: 'profile1', userId: faker.database.mongodbObjectId(), profession: 'Doctor', experience: 5 };

            (professionProfileService.findById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockProfile);

            const response = await request(app).get(`/api/v1/professionalProfile/${mockProfile._id}`);

            expect(response.status).toBe(200);
            expect(professionProfileService.findById).toHaveBeenCalledWith(mockProfile._id);
            expect(response.body).toEqual({
                success: true,
                message: 'Profession fetched successfully',
                data: mockProfile,
            });
        });
    });

    describe('Create profession profile', () => {
        it('should create a new profession profile', async () => {
            const profileData = {
                userId: faker.database.mongodbObjectId(),
                profession: 'Doctor',
                experience: 5,
                specialties: ['Cardiology'],
                education: ['Medical School'],
            };

            const createdProfile = { ...profileData, _id: 'profile123' };
            (professionProfileService.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(createdProfile);

            const response = await request(app).post('/api/v1/professionalProfile').send(profileData);

            expect(response.status).toBe(201);
            expect(professionProfileService.create).toHaveBeenCalledWith(profileData);
            expect(response.body).toEqual({
                success: true,
                message: 'Profession created successfully',
                data: createdProfile,
            });
        });
    });

    describe('Update profession profile', () => {
        it('should update profession profile by id', async () => {
            const profileId = 'profile123';
            const updateData = {
                experience: 7,
                specialties: ['Cardiology', 'Neurology'],
            };

            const updatedProfile = { ...updateData, _id: profileId };
            (professionProfileService.updateById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(updatedProfile);

            const response = await request(app).put(`/api/v1/professionalProfile/${profileId}`).send(updateData);

            expect(response.status).toBe(200);
            expect(professionProfileService.updateById).toHaveBeenCalledWith(profileId, updateData);
            expect(response.body).toEqual({
                success: true,
                message: 'Profession updated successfully',
                data: updatedProfile,
            });
        });
    });

    describe('Delete profession profile', () => {
        it('should delete profession profile by id', async () => {
            const profileId = 'profile123';

            (professionProfileService.deleteById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

            const response = await request(app).delete(`/api/v1/professionalProfile/${profileId}`);

            expect(response.status).toBe(200);
            expect(professionProfileService.deleteById).toHaveBeenCalledWith(profileId);
            expect(response.body).toEqual({
                success: true,
                message: 'Profession deleted successfully',
            });
        });
    });
});
