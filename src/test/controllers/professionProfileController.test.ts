import request from 'supertest';
import { setupCommonMocks, resetMocks } from '../utils/testHelpers';

// === CRITICAL: Mocks must be defined BEFORE any imports ===
setupCommonMocks();

// Mock services with proper structure
jest.mock('../../services/ProfessionProfileService', () => ({
    professionProfileService: {
        getAll: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
        updateById: jest.fn(),
        deleteById: jest.fn(),
    },
}));

// Now import the app after all mocks are set up
import app from '../../app';
import { professionProfileService } from '../../services/ProfessionProfileService';

beforeEach(() => {
    resetMocks();
});

describe('ProfessionProfile Controllers', () => {
    describe('Get all profession profiles', () => {
        it('should get all profession profiles', async () => {
            const mockProfiles = [
                { _id: 'profile1', userId: 'user1', profession: 'Doctor', experience: 5 },
                { _id: 'profile2', userId: 'user2', profession: 'Engineer', experience: 3 },
            ];

            (professionProfileService.getAll as jest.Mock).mockResolvedValueOnce(mockProfiles);

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
            const mockProfile = { _id: 'profile1', userId: 'user1', profession: 'Doctor', experience: 5 };

            (professionProfileService.findById as jest.Mock).mockResolvedValueOnce(mockProfile);

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
                userId: 'user123',
                profession: 'Doctor',
                experience: 5,
                specialties: ['Cardiology'],
                education: ['Medical School'],
            };

            const createdProfile = { ...profileData, _id: 'profile123' };
            (professionProfileService.create as jest.Mock).mockResolvedValueOnce(createdProfile);

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
            (professionProfileService.updateById as jest.Mock).mockResolvedValueOnce(updatedProfile);

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

            (professionProfileService.deleteById as jest.Mock).mockResolvedValueOnce(undefined);

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
