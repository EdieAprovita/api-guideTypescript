import { vi } from 'vitest';
// Sanctuary Controllers Test - Refactored to use centralized mocking system
import request from 'supertest';
import app from '../../app';
import { sanctuaryService } from '../../services/SanctuaryService';
import { reviewService } from '../../services/ReviewService';
import {
    expectSuccessResponse,
    expectResourceCreated,
    expectResourceUpdated,
    expectResourceDeleted,
    createMockData,
} from '../utils/testHelpers';
import { MockSanctuaryService, MockReviewService } from '../types';

// Only mock the specific services used in this test
vi.mock('../../services/SanctuaryService');
vi.mock('../../services/ReviewService');

const mockSanctuaryService = sanctuaryService as unknown as MockSanctuaryService;
const mockReviewService = reviewService as unknown as MockReviewService;

describe('Sanctuary Controllers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/v1/sanctuaries', () => {
        it('should get all sanctuaries', async () => {
            const mockSanctuaries = [
                createMockData.sanctuary({ sanctuaryName: 'Test Sanctuary 1' }),
                createMockData.sanctuary({ sanctuaryName: 'Test Sanctuary 2' }),
            ];
            mockSanctuaryService.getAll.mockResolvedValue(mockSanctuaries);

            const response = await request(app).get('/api/v1/sanctuaries');

            expectSuccessResponse(response);
            expect(mockSanctuaryService.getAll).toHaveBeenCalledTimes(1);
            expect(response.body.data).toEqual(mockSanctuaries);
        });

        it('should handle empty sanctuary list', async () => {
            mockSanctuaryService.getAll.mockResolvedValue([]);

            const response = await request(app).get('/api/v1/sanctuaries');

            expectSuccessResponse(response);
            expect(response.body.data).toEqual([]);
        });
    });

    describe('GET /api/v1/sanctuaries/:id', () => {
        it('should get sanctuary by id', async () => {
            const sanctuaryId = 'sanctuary-123';
            const mockSanctuary = createMockData.sanctuary({
                _id: sanctuaryId,
                sanctuaryName: 'Specific Sanctuary',
            });
            mockSanctuaryService.findById.mockResolvedValue(mockSanctuary);

            const response = await request(app).get(`/api/v1/sanctuaries/${sanctuaryId}`);

            expectSuccessResponse(response);
            expect(mockSanctuaryService.findById).toHaveBeenCalledWith(sanctuaryId);
            expect(response.body.data).toEqual(mockSanctuary);
        });
    });

    describe('POST /api/v1/sanctuaries', () => {
        it('should create a new sanctuary', async () => {
            const newSanctuaryData = {
                sanctuaryName: 'New Sanctuary',
                location: { type: 'Point', coordinates: [40.7128, -74.006] },
                address: 'New Sanctuary Address',
            };
            const createdSanctuary = createMockData.sanctuary({
                ...newSanctuaryData,
                _id: 'new-sanctuary-id',
            });
            mockSanctuaryService.create.mockResolvedValue(createdSanctuary);

            const response = await request(app).post('/api/v1/sanctuaries').send(newSanctuaryData);

            expectResourceCreated(response);
            expect(mockSanctuaryService.create).toHaveBeenCalledWith(newSanctuaryData);
            expect(response.body.data).toEqual(createdSanctuary);
        });
    });

    describe('PUT /api/v1/sanctuaries/:id', () => {
        it('should update a sanctuary', async () => {
            const sanctuaryId = 'sanctuary-123';
            const updateData = {
                sanctuaryName: 'Updated Sanctuary Name',
            };
            const updatedSanctuary = createMockData.sanctuary({
                ...updateData,
                _id: sanctuaryId,
            });
            mockSanctuaryService.updateById.mockResolvedValue(updatedSanctuary);

            const response = await request(app).put(`/api/v1/sanctuaries/${sanctuaryId}`).send(updateData);

            expectResourceUpdated(response);
            expect(mockSanctuaryService.updateById).toHaveBeenCalledWith(sanctuaryId, updateData);
            expect(response.body.data).toEqual(updatedSanctuary);
        });
    });

    describe('DELETE /api/v1/sanctuaries/:id', () => {
        it('should delete a sanctuary', async () => {
            const sanctuaryId = 'sanctuary-123';
            mockSanctuaryService.deleteById.mockResolvedValue(undefined);

            const response = await request(app).delete(`/api/v1/sanctuaries/${sanctuaryId}`);

            expectResourceDeleted(response);
            expect(mockSanctuaryService.deleteById).toHaveBeenCalledWith(sanctuaryId);
        });
    });

    describe('Sanctuary with Reviews Integration', () => {
        it('should handle sanctuary with reviews', async () => {
            const sanctuaryId = 'sanctuary-with-reviews';
            const mockSanctuary = createMockData.sanctuary({
                _id: sanctuaryId,
                sanctuaryName: 'Sanctuary with Reviews',
            });
            const mockReviews = [
                { _id: 'review1', rating: 5, comment: 'Amazing sanctuary!' },
                { _id: 'review2', rating: 4, comment: 'Great work with animals!' },
            ];

            mockSanctuaryService.findById.mockResolvedValue(mockSanctuary);
            mockReviewService.getTopRatedReviews.mockResolvedValue(mockReviews);

            const response = await request(app).get(`/api/v1/sanctuaries/${sanctuaryId}`);

            expectSuccessResponse(response);
            expect(mockSanctuaryService.findById).toHaveBeenCalledWith(sanctuaryId);
            expect(response.body.data).toEqual(mockSanctuary);
        });
    });

    describe('Geolocation Integration', () => {
        it('should handle sanctuaries with location data', async () => {
            const mockSanctuaries = [
                createMockData.sanctuary({
                    sanctuaryName: 'Location Sanctuary',
                    location: { type: 'Point', coordinates: [40.7128, -74.006] },
                }),
            ];
            mockSanctuaryService.getAll.mockResolvedValue(mockSanctuaries);

            const response = await request(app).get('/api/v1/sanctuaries');

            expectSuccessResponse(response);
            expect(response.body.data).toEqual(mockSanctuaries);
        });
    });
});
