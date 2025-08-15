// Restaurant Controllers Test - Refactored to use centralized mocking system
import request from 'supertest';
import app from '../../app';
import { restaurantService } from '../../services/RestaurantService';
import { reviewService } from '../../services/ReviewService';
import {
    expectSuccessResponse,
    expectResourceCreated,
    expectResourceUpdated,
    expectResourceDeleted,
    createMockData,
} from '../utils/testHelpers';
import { MockRestaurantService, MockReviewService } from '../types';

// Only mock the specific services used in this test
vi.mock('../../services/RestaurantService');
vi.mock('../../services/ReviewService');

const mockRestaurantService = restaurantService as unknown as MockRestaurantService;
const mockReviewService = reviewService as unknown as MockReviewService;

describe('Restaurant Controllers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/v1/restaurants', () => {
        it('should get all restaurants', async () => {
            const mockRestaurants = [
                createMockData.restaurant({ restaurantName: 'Test Restaurant 1', cuisine: ['Italian'] }),
                createMockData.restaurant({ restaurantName: 'Test Restaurant 2', cuisine: ['Mexican'] }),
            ];
            mockRestaurantService.getAllCached.mockResolvedValue(mockRestaurants);

            const response = await request(app).get('/api/v1/restaurants');

            expectSuccessResponse(response);
            expect(mockRestaurantService.getAllCached).toHaveBeenCalledTimes(1);
            expect(response.body.data).toEqual(mockRestaurants);
        });

        it('should handle empty restaurant list', async () => {
            mockRestaurantService.getAllCached.mockResolvedValue([]);

            const response = await request(app).get('/api/v1/restaurants');

            expectSuccessResponse(response);
            expect(response.body.data).toEqual([]);
        });
    });

    describe('GET /api/v1/restaurants/:id', () => {
        it('should get restaurant by id', async () => {
            const restaurantId = 'restaurant-123';
            const mockRestaurant = createMockData.restaurant({
                _id: restaurantId,
                restaurantName: 'Specific Restaurant',
            });
            mockRestaurantService.findByIdCached.mockResolvedValue(mockRestaurant);

            const response = await request(app).get(`/api/v1/restaurants/${restaurantId}`);

            expectSuccessResponse(response);
            expect(mockRestaurantService.findByIdCached).toHaveBeenCalledWith(restaurantId);
            expect(response.body.data).toEqual(mockRestaurant);
        });
    });

    describe('POST /api/v1/restaurants', () => {
        it('should create a new restaurant', async () => {
            const newRestaurantData = {
                restaurantName: 'New Restaurant',
                cuisine: ['Italian'],
                location: { type: 'Point', coordinates: [40.7128, -74.006] },
                address: 'A great new restaurant address',
            };
            const createdRestaurant = createMockData.restaurant({
                ...newRestaurantData,
                _id: 'new-restaurant-id',
            });
            mockRestaurantService.createCached.mockResolvedValue(createdRestaurant);

            const response = await request(app).post('/api/v1/restaurants').send(newRestaurantData);

            expectResourceCreated(response);
            expect(mockRestaurantService.createCached).toHaveBeenCalledWith(newRestaurantData);
            expect(response.body.data).toEqual(createdRestaurant);
        });
    });

    describe('PUT /api/v1/restaurants/:id', () => {
        it('should update a restaurant', async () => {
            const restaurantId = 'restaurant-123';
            const updateData = {
                restaurantName: 'Updated Restaurant Name',
                cuisine: ['Updated Cuisine'],
            };
            const updatedRestaurant = createMockData.restaurant({
                ...updateData,
                _id: restaurantId,
            });
            mockRestaurantService.updateByIdCached.mockResolvedValue(updatedRestaurant);

            const response = await request(app).put(`/api/v1/restaurants/${restaurantId}`).send(updateData);

            expectResourceUpdated(response);
            expect(mockRestaurantService.updateByIdCached).toHaveBeenCalledWith(restaurantId, updateData);
            expect(response.body.data).toEqual(updatedRestaurant);
        });
    });

    describe('DELETE /api/v1/restaurants/:id', () => {
        it('should delete a restaurant', async () => {
            const restaurantId = 'restaurant-123';
            mockRestaurantService.deleteById.mockResolvedValue(undefined);

            const response = await request(app).delete(`/api/v1/restaurants/${restaurantId}`);

            expectResourceDeleted(response);
            expect(mockRestaurantService.deleteById).toHaveBeenCalledWith(restaurantId);
        });
    });

    describe('Restaurant with Reviews Integration', () => {
        it('should handle restaurant with reviews', async () => {
            const restaurantId = 'restaurant-with-reviews';
            const mockRestaurant = createMockData.restaurant({
                _id: restaurantId,
                restaurantName: 'Restaurant with Reviews',
            });
            const mockReviews = [
                { _id: 'review1', rating: 5, comment: 'Excellent!' },
                { _id: 'review2', rating: 4, comment: 'Very good!' },
            ];

            mockRestaurantService.findByIdCached.mockResolvedValue(mockRestaurant);
            mockReviewService.getTopRatedReviews.mockResolvedValue(mockReviews);

            const response = await request(app).get(`/api/v1/restaurants/${restaurantId}`);

            expectSuccessResponse(response);
            expect(mockRestaurantService.findByIdCached).toHaveBeenCalledWith(restaurantId);
            expect(response.body.data).toEqual(mockRestaurant);
        });
    });

    describe('Geolocation Integration', () => {
        it('should handle restaurants with location data', async () => {
            const mockRestaurants = [
                createMockData.restaurant({
                    restaurantName: 'Location Restaurant',
                    location: { type: 'Point', coordinates: [40.7128, -74.006] },
                }),
            ];
            mockRestaurantService.getAllCached.mockResolvedValue(mockRestaurants);

            // The geoService is handled by the centralized mock system

            const response = await request(app).get('/api/v1/restaurants');

            expectSuccessResponse(response);
            expect(response.body.data).toEqual(mockRestaurants);
        });
    });
});
