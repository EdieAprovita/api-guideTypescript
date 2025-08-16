// Markets Controllers Test - Refactored to use centralized mocking system
import { vi, describe, it, beforeEach, expect } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { marketsService } from '../../services/MarketsService';
import { reviewService } from '../../services/ReviewService';
import { 
    expectSuccessResponse, 
    expectResourceCreated, 
    expectResourceUpdated, 
    expectResourceDeleted,
    createMockData 
} from '../utils/testHelpers';
import { MockMarketService, MockReviewService } from '../types';

// Only mock the specific services used in this test
vi.mock('../../services/MarketsService');
vi.mock('../../services/ReviewService');

const mockMarketsService = marketsService as unknown as MockMarketService;
const mockReviewService = reviewService as unknown as MockReviewService;

describe('Markets Controllers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/v1/markets', () => {
        it('should get all markets', async () => {
            const mockMarkets = [
                createMockData.market({ marketName: 'Test Market 1' }),
                createMockData.market({ marketName: 'Test Market 2' }),
            ];
            mockMarketsService.getAll.mockResolvedValue(mockMarkets);

            const response = await request(app).get('/api/v1/markets');

            expectSuccessResponse(response);
            expect(mockMarketsService.getAll).toHaveBeenCalledTimes(1);
            expect(response.body.data).toEqual(mockMarkets);
        });

        it('should handle empty markets list', async () => {
            mockMarketsService.getAll.mockResolvedValue([]);

            const response = await request(app).get('/api/v1/markets');

            expectSuccessResponse(response);
            expect(response.body.data).toEqual([]);
        });
    });

    describe('GET /api/v1/markets/:id', () => {
        it('should get market by id', async () => {
            const marketId = 'market-123';
            const mockMarket = createMockData.market({ 
                _id: marketId, 
                marketName: 'Specific Market'
            });
            mockMarketsService.findById.mockResolvedValue(mockMarket);

            const response = await request(app).get(`/api/v1/markets/${marketId}`);

            expectSuccessResponse(response);
            expect(mockMarketsService.findById).toHaveBeenCalledWith(marketId);
            expect(response.body.data).toEqual(mockMarket);
        });
    });

    describe('POST /api/v1/markets', () => {
        it('should create a new market', async () => {
            const newMarketData = {
                marketName: 'New Market',
                location: { type: 'Point', coordinates: [40.7128, -74.0060] },
                address: 'New Market Address',
            };
            const createdMarket = createMockData.market({ 
                ...newMarketData, 
                _id: 'new-market-id' 
            });
            mockMarketsService.create.mockResolvedValue(createdMarket);

            const response = await request(app)
                .post('/api/v1/markets')
                .send(newMarketData);

            expectResourceCreated(response);
            expect(mockMarketsService.create).toHaveBeenCalledWith(newMarketData);
            expect(response.body.data).toEqual(createdMarket);
        });
    });

    describe('PUT /api/v1/markets/:id', () => {
        it('should update a market', async () => {
            const marketId = 'market-123';
            const updateData = { 
                marketName: 'Updated Market Name'
            };
            const updatedMarket = createMockData.market({ 
                ...updateData, 
                _id: marketId 
            });
            mockMarketsService.updateById.mockResolvedValue(updatedMarket);

            const response = await request(app)
                .put(`/api/v1/markets/${marketId}`)
                .send(updateData);

            expectResourceUpdated(response);
            expect(mockMarketsService.updateById).toHaveBeenCalledWith(marketId, updateData);
            expect(response.body.data).toEqual(updatedMarket);
        });
    });

    describe('DELETE /api/v1/markets/:id', () => {
        it('should delete a market', async () => {
            const marketId = 'market-123';
            mockMarketsService.deleteById.mockResolvedValue(undefined);

            const response = await request(app).delete(`/api/v1/markets/${marketId}`);

            expectResourceDeleted(response);
            expect(mockMarketsService.deleteById).toHaveBeenCalledWith(marketId);
        });
    });

    describe('Market with Reviews Integration', () => {
        it('should handle market with reviews', async () => {
            const marketId = 'market-with-reviews';
            const mockMarket = createMockData.market({ 
                _id: marketId,
                marketName: 'Market with Reviews'
            });
            const mockReviews = [
                { _id: 'review1', rating: 5, comment: 'Great market!' },
                { _id: 'review2', rating: 4, comment: 'Good selection!' }
            ];

            mockMarketsService.findById.mockResolvedValue(mockMarket);
            mockReviewService.getTopRatedReviews.mockResolvedValue(mockReviews);

            const response = await request(app).get(`/api/v1/markets/${marketId}`);

            expectSuccessResponse(response);
            expect(mockMarketsService.findById).toHaveBeenCalledWith(marketId);
            expect(response.body.data).toEqual(mockMarket);
        });
    });

    describe('Geolocation Integration', () => {
        it('should handle markets with location data', async () => {
            const mockMarkets = [
                createMockData.market({ 
                    marketName: 'Location Market',
                    location: { type: 'Point', coordinates: [40.7128, -74.0060] }
                })
            ];
            mockMarketsService.getAll.mockResolvedValue(mockMarkets);

            const response = await request(app).get('/api/v1/markets');

            expectSuccessResponse(response);
            expect(response.body.data).toEqual(mockMarkets);
        });
    });
});