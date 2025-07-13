import request from 'supertest';
import app from '../../app';
import { setupTestDb, teardownTestDb } from './helpers/testDb';
import { createTestUser, generateAuthToken } from './helpers/authHelper';
import { Review } from '../../models/Review';
import { Restaurant } from '../../models/Restaurant';
import { testDataFactory, PopulatedReview } from '../types/testTypes';

describe('Review Integration Tests', () => {
    let authToken: string;
    let testUserId: string;
    let restaurantId: string;
    let reviewId: string;

    const validRestaurantData = {
        ...testDataFactory.restaurant(),
        name: 'Test Restaurant for Reviews',
        description: 'Restaurant for review testing',
        phone: '+1-555-999-1111',
        email: 'reviews@restaurant.com',
        address: {
            street: '123 Review Street',
            city: 'Test City',
            state: 'Test State',
            country: 'USA',
            zipCode: '12345'
        }
    };

    const validReviewData = {
        ...testDataFactory.review(),
        title: 'Amazing vegan restaurant!',
        content: 'The food was absolutely delicious. Great variety of vegan options and excellent service. Highly recommended!',
        recommendedDishes: ['Vegan Burger', 'Quinoa Salad']
    };

    beforeAll(async () => {
        await setupTestDb();
        const user = await createTestUser();
        testUserId = user._id.toString();
        authToken = generateAuthToken(user._id.toString());

        // Create a test restaurant
        const restaurant = await Restaurant.create({
            ...validRestaurantData,
            owner: testUserId
        });
        restaurantId = restaurant._id.toString();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await Review.deleteMany({});
    });

    describe('POST /api/v1/restaurants/:restaurantId/reviews', () => {
        it('should create a new review with valid data', async () => {
            const response = await request(app)
                .post(`/api/v1/restaurants/${restaurantId}/reviews`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(validReviewData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('_id');
            expect(response.body.data.rating).toBe(validReviewData.rating);
            expect(response.body.data.title).toBe(validReviewData.title);
            expect(response.body.data.author).toBe(testUserId);
            expect(response.body.data.restaurant).toBe(restaurantId);
            
            reviewId = response.body.data._id;
        });

        it('should return 400 for invalid rating', async () => {
            const invalidData = { ...validReviewData, rating: 6 }; // Rating should be 1-5
            
            const response = await request(app)
                .post(`/api/v1/restaurants/${restaurantId}/reviews`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('validation');
        });

        it('should return 400 for missing required fields', async () => {
            const invalidData = { ...validReviewData };
            delete (invalidData as Partial<typeof validReviewData>).rating;
            
            const response = await request(app)
                .post(`/api/v1/restaurants/${restaurantId}/reviews`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should return 401 without authentication', async () => {
            await request(app)
                .post(`/api/v1/restaurants/${restaurantId}/reviews`)
                .send(validReviewData)
                .expect(401);
        });

        it('should return 404 for non-existent restaurant', async () => {
            const fakeRestaurantId = '507f1f77bcf86cd799439011';
            
            const response = await request(app)
                .post(`/api/v1/restaurants/${fakeRestaurantId}/reviews`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(validReviewData)
                .expect(404);

            expect(response.body.success).toBe(false);
        });

        it('should prevent duplicate reviews from same user', async () => {
            // Create first review
            await request(app)
                .post(`/api/v1/restaurants/${restaurantId}/reviews`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(validReviewData)
                .expect(201);

            // Try to create second review
            const response = await request(app)
                .post(`/api/v1/restaurants/${restaurantId}/reviews`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ ...validReviewData, title: 'Second review' })
                .expect(409);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('already reviewed');
        });

        it('should validate content length', async () => {
            const invalidData = {
                ...validReviewData,
                content: 'Too short' // Assuming minimum content length requirement
            };
            
            const response = await request(app)
                .post(`/api/v1/restaurants/${restaurantId}/reviews`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/v1/restaurants/:restaurantId/reviews', () => {
        beforeEach(async () => {
            // Create multiple reviews
            const user2 = await createTestUser('user2@example.com');
            const user3 = await createTestUser('user3@example.com');

            await Review.create([
                { ...validReviewData, restaurant: restaurantId, author: testUserId, rating: 5 },
                { ...validReviewData, restaurant: restaurantId, author: user2._id, rating: 4, title: 'Good restaurant' },
                { ...validReviewData, restaurant: restaurantId, author: user3._id, rating: 3, title: 'Average experience' }
            ]);
        });

        it('should get all reviews for a restaurant', async () => {
            const response = await request(app)
                .get(`/api/v1/restaurants/${restaurantId}/reviews`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(3);
            expect(response.body.pagination).toBeDefined();
        });

        it('should populate author information', async () => {
            const response = await request(app)
                .get(`/api/v1/restaurants/${restaurantId}/reviews`)
                .expect(200);

            expect(response.body.success).toBe(true);
            response.body.data.forEach((review: PopulatedReview) => {
                expect(review.author).toHaveProperty('firstName');
                expect(review.author).toHaveProperty('lastName');
                expect(review.author).not.toHaveProperty('password');
                expect(review.author).not.toHaveProperty('email');
            });
        });

        it('should support pagination', async () => {
            const response = await request(app)
                .get(`/api/v1/restaurants/${restaurantId}/reviews?page=1&limit=2`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(2);
        });

        it('should filter by rating', async () => {
            const response = await request(app)
                .get(`/api/v1/restaurants/${restaurantId}/reviews?rating=5`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].rating).toBe(5);
        });

        it('should sort reviews', async () => {
            const response = await request(app)
                .get(`/api/v1/restaurants/${restaurantId}/reviews?sort=-rating`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data[0].rating).toBeGreaterThanOrEqual(response.body.data[1].rating);
        });

        it('should return 404 for non-existent restaurant', async () => {
            const fakeRestaurantId = '507f1f77bcf86cd799439011';
            
            const response = await request(app)
                .get(`/api/v1/restaurants/${fakeRestaurantId}/reviews`)
                .expect(404);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/v1/reviews/:id', () => {
        beforeEach(async () => {
            const review = await Review.create({
                ...validReviewData,
                restaurant: restaurantId,
                author: testUserId
            });
            reviewId = review._id.toString();
        });

        it('should get review by ID', async () => {
            const response = await request(app)
                .get(`/api/v1/reviews/${reviewId}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data._id).toBe(reviewId);
            expect(response.body.data.rating).toBe(validReviewData.rating);
        });

        it('should populate restaurant and author information', async () => {
            const response = await request(app)
                .get(`/api/v1/reviews/${reviewId}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.restaurant).toHaveProperty('name');
            expect(response.body.data.author).toHaveProperty('firstName');
        });

        it('should return 404 for non-existent review', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            
            const response = await request(app)
                .get(`/api/v1/reviews/${fakeId}`)
                .expect(404);

            expect(response.body.success).toBe(false);
        });

        it('should return 400 for invalid ID format', async () => {
            const response = await request(app)
                .get('/api/v1/reviews/invalid-id')
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/v1/reviews/:id', () => {
        beforeEach(async () => {
            const review = await Review.create({
                ...validReviewData,
                restaurant: restaurantId,
                author: testUserId
            });
            reviewId = review._id.toString();
        });

        it('should update review by author', async () => {
            const updateData = {
                rating: 4,
                title: 'Updated review title',
                content: 'Updated review content with more details about the experience.'
            };

            const response = await request(app)
                .put(`/api/v1/reviews/${reviewId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.rating).toBe(updateData.rating);
            expect(response.body.data.title).toBe(updateData.title);
            expect(response.body.data.content).toBe(updateData.content);
        });

        it('should return 401 without authentication', async () => {
            const updateData = { rating: 4 };

            await request(app)
                .put(`/api/v1/reviews/${reviewId}`)
                .send(updateData)
                .expect(401);
        });

        it('should return 403 for non-author', async () => {
            const anotherUser = await createTestUser('another@test.com');
            const anotherToken = generateAuthToken(anotherUser._id.toString());

            const updateData = { rating: 4 };

            const response = await request(app)
                .put(`/api/v1/reviews/${reviewId}`)
                .set('Authorization', `Bearer ${anotherToken}`)
                .send(updateData)
                .expect(403);

            expect(response.body.success).toBe(false);
        });

        it('should validate updated data', async () => {
            const invalidUpdateData = {
                rating: 6 // Invalid rating
            };

            const response = await request(app)
                .put(`/api/v1/reviews/${reviewId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidUpdateData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('DELETE /api/v1/reviews/:id', () => {
        beforeEach(async () => {
            const review = await Review.create({
                ...validReviewData,
                restaurant: restaurantId,
                author: testUserId
            });
            reviewId = review._id.toString();
        });

        it('should delete review by author', async () => {
            const response = await request(app)
                .delete(`/api/v1/reviews/${reviewId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);

            // Verify review is deleted
            const deletedReview = await Review.findById(reviewId);
            expect(deletedReview).toBeNull();
        });

        it('should return 401 without authentication', async () => {
            await request(app)
                .delete(`/api/v1/reviews/${reviewId}`)
                .expect(401);
        });

        it('should return 403 for non-author', async () => {
            const anotherUser = await createTestUser('another3@test.com');
            const anotherToken = generateAuthToken(anotherUser._id.toString());

            const response = await request(app)
                .delete(`/api/v1/reviews/${reviewId}`)
                .set('Authorization', `Bearer ${anotherToken}`)
                .expect(403);

            expect(response.body.success).toBe(false);
        });
    });

    describe('Review Statistics and Aggregation', () => {
        beforeEach(async () => {
            const user2 = await createTestUser('stats1@example.com');
            const user3 = await createTestUser('stats2@example.com');
            const user4 = await createTestUser('stats3@example.com');

            await Review.create([
                { ...validReviewData, restaurant: restaurantId, author: testUserId, rating: 5 },
                { ...validReviewData, restaurant: restaurantId, author: user2._id, rating: 4 },
                { ...validReviewData, restaurant: restaurantId, author: user3._id, rating: 4 },
                { ...validReviewData, restaurant: restaurantId, author: user4._id, rating: 3 }
            ]);
        });

        it('should get review statistics for restaurant', async () => {
            const response = await request(app)
                .get(`/api/v1/restaurants/${restaurantId}/reviews/stats`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('averageRating');
            expect(response.body.data).toHaveProperty('totalReviews');
            expect(response.body.data).toHaveProperty('ratingDistribution');
            expect(response.body.data.totalReviews).toBe(4);
            expect(response.body.data.averageRating).toBe(4);
        });

        it('should include rating distribution', async () => {
            const response = await request(app)
                .get(`/api/v1/restaurants/${restaurantId}/reviews/stats`)
                .expect(200);

            expect(response.body.success).toBe(true);
            const distribution = response.body.data.ratingDistribution;
            expect(distribution).toHaveProperty('5');
            expect(distribution).toHaveProperty('4');
            expect(distribution).toHaveProperty('3');
            expect(distribution['5']).toBe(1);
            expect(distribution['4']).toBe(2);
            expect(distribution['3']).toBe(1);
        });
    });

    describe('Review Helpful Votes', () => {
        beforeEach(async () => {
            const review = await Review.create({
                ...validReviewData,
                restaurant: restaurantId,
                author: testUserId
            });
            reviewId = review._id.toString();
        });

        it('should allow users to mark review as helpful', async () => {
            const anotherUser = await createTestUser('helpful@example.com');
            const anotherToken = generateAuthToken(anotherUser._id.toString());

            const response = await request(app)
                .post(`/api/v1/reviews/${reviewId}/helpful`)
                .set('Authorization', `Bearer ${anotherToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.helpfulCount).toBe(1);
        });

        it('should prevent duplicate helpful votes', async () => {
            const anotherUser = await createTestUser('helpful2@example.com');
            const anotherToken = generateAuthToken(anotherUser._id.toString());

            // First vote
            await request(app)
                .post(`/api/v1/reviews/${reviewId}/helpful`)
                .set('Authorization', `Bearer ${anotherToken}`)
                .expect(200);

            // Second vote (should fail)
            const response = await request(app)
                .post(`/api/v1/reviews/${reviewId}/helpful`)
                .set('Authorization', `Bearer ${anotherToken}`)
                .expect(409);

            expect(response.body.success).toBe(false);
        });

        it('should allow removing helpful vote', async () => {
            const anotherUser = await createTestUser('helpful3@example.com');
            const anotherToken = generateAuthToken(anotherUser._id.toString());

            // Add helpful vote
            await request(app)
                .post(`/api/v1/reviews/${reviewId}/helpful`)
                .set('Authorization', `Bearer ${anotherToken}`)
                .expect(200);

            // Remove helpful vote
            const response = await request(app)
                .delete(`/api/v1/reviews/${reviewId}/helpful`)
                .set('Authorization', `Bearer ${anotherToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.helpfulCount).toBe(0);
        });
    });

    describe('Review Cache Integration', () => {
        it('should cache review listings', async () => {
            await Review.create({
                ...validReviewData,
                restaurant: restaurantId,
                author: testUserId
            });

            // First request
            const response1 = await request(app)
                .get(`/api/v1/restaurants/${restaurantId}/reviews`)
                .expect(200);

            // Second request (should be cached)
            const response2 = await request(app)
                .get(`/api/v1/restaurants/${restaurantId}/reviews`)
                .expect(200);

            expect(response1.body.data).toEqual(response2.body.data);
        });
    });
});