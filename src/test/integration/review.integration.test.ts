import request from 'supertest';
import app from '../../app';
import { setupTestDb, teardownTestDb } from './helpers/testDb';
import { createTestUser, generateAuthToken } from './helpers/authHelper';
import { Review } from '../../models/Review';
import { Restaurant } from '../../models/Restaurant';
import { User } from '../../models/User';
import { testDataFactory, PopulatedReview } from '../types/testTypes';
import { 
    expectSuccessResponse, 
    expectErrorResponse, 
    expectValidationError,
    expectUnauthorizedError,
    expectNotFoundError,
    expectResourceCreated,
    expectResourceUpdated,
    expectResourceDeleted
} from '../utils/consolidatedHelpers';

describe('Review Integration Tests', () => {
    let authToken: string;
    let testUserId: string;
    let restaurantId: string;
    let reviewId: string;

    const validRestaurantData = {
        restaurantName: 'Test Restaurant for Reviews',
        address: '123 Review Street, Test City, Test State, USA, 12345',
        cuisine: ['vegan', 'organic'],
        contact: [
            {
                phone: '+1-555-999-1111',
                facebook: '',
                instagram: ''
            }
        ],
        rating: 0,
        numReviews: 0,
        reviews: []
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
            ...testDataFactory.restaurant(),
            restaurantName: 'Test Restaurant for Reviews',
            author: testUserId,
            address: '123 Review Street, Test City, Test State, USA, 12345',
            cuisine: ['vegan', 'organic'],
            contact: [
                {
                    phone: '+1-555-999-1111',
                    facebook: '',
                    instagram: ''
                }
            ],
            rating: 0,
            numReviews: 0,
            reviews: []
        });
        restaurantId = restaurant._id.toString();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await Review.deleteMany({});
    });

    describe('Basic Setup Test', () => {
        it('should have created user and restaurant successfully', () => {
            expect(testUserId).toBeDefined();
            expect(restaurantId).toBeDefined();
            expect(authToken).toBeDefined();
        });
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
    });
});