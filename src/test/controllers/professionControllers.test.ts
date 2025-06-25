import request from 'supertest';
import { setupCommonMocks, resetMocks } from '../utils/testHelpers';

// === CRITICAL: Mocks must be defined BEFORE any imports ===
setupCommonMocks();

// Mock services with proper structure
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

// Now import the app after all mocks are set up
import app from '../../app';
import { professionService } from '../../services/ProfessionService';
import { reviewService } from '../../services/ReviewService';

beforeEach(() => {
    resetMocks();
});

describe('Profession Controllers', () => {
    describe('Get all professions', () => {
        it('should get all professions', async () => {
            const mockProfessions = [
                { _id: 'prof1', name: 'Doctor', description: 'Medical professional' },
                { _id: 'prof2', name: 'Engineer', description: 'Technical professional' },
            ];

            (professionService.getAll as jest.Mock).mockResolvedValueOnce(mockProfessions);

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

            (professionService.findById as jest.Mock).mockResolvedValueOnce(mockProfession);

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
            (professionService.create as jest.Mock).mockResolvedValueOnce(createdProfession);

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
            (professionService.updateById as jest.Mock).mockResolvedValueOnce(updatedProfession);

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

            (professionService.deleteById as jest.Mock).mockResolvedValueOnce(undefined);

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
