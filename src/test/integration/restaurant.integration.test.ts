import request from 'supertest';
import app from '../../app';
import { setupTestDb, teardownTestDb } from './helpers/testDb';
import { createTestUser, generateAuthToken } from './helpers/authHelper';
import { Restaurant } from '../../models/Restaurant';
import { testDataFactory } from '../types/testTypes';

describe('Restaurant Integration Tests', () => {
    let authToken: string;
    let testUserId: string;
    let restaurantId: string;

    beforeAll(async () => {
        await setupTestDb();
        const user = await createTestUser();
        testUserId = user._id.toString();
        authToken = generateAuthToken(user._id.toString());
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        // Clean up restaurants
        await Restaurant.deleteMany({});
    });

    describe('POST /api/v1/restaurants', () => {
        const validRestaurantData = {
            ...testDataFactory.restaurant(),
            name: 'Green Garden Restaurant',
            description: 'Best vegan food in town',
            phone: '+1-555-123-4567',
            email: 'info@greengarden.com',
            website: 'https://greengarden.com',
            address: {
                street: '123 Vegan Street',
                city: 'Plant City',
                state: 'California',
                country: 'USA',
                zipCode: '90210'
            },
            cuisine: ['mediterranean', 'italian'],
            features: ['outdoor-seating', 'delivery'],
            businessHours: {
                monday: { open: '09:00', close: '22:00', closed: false },
                tuesday: { open: '09:00', close: '22:00', closed: false },
                wednesday: { open: '09:00', close: '22:00', closed: false },
                thursday: { open: '09:00', close: '22:00', closed: false },
                friday: { open: '09:00', close: '23:00', closed: false },
                saturday: { open: '09:00', close: '23:00', closed: false },
                sunday: { open: '10:00', close: '21:00', closed: false }
            }
        };

        it('should create a new restaurant with valid data', async () => {
            const response = await request(app)
                .post('/api/v1/restaurants')
                .set('Authorization', `Bearer ${authToken}`)
                .send(testDataFactory.restaurant())
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('_id');
            expect(response.body.data.name).toBe(testDataFactory.restaurant().name);
            expect(response.body.data.owner).toBe(testUserId);
            
            restaurantId = response.body.data._id;
        });

        it('should return 400 for invalid data', async () => {
            const invalidData = { ...testDataFactory.restaurant(), name: '' };
            
            const response = await request(app)
                .post('/api/v1/restaurants')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('validation');
        });

        it('should return 401 without authentication', async () => {
            await request(app)
                .post('/api/v1/restaurants')
                .send(testDataFactory.restaurant())
                .expect(401);
        });

        it('should validate location coordinates', async () => {
            const invalidLocationData = {
                ...testDataFactory.restaurant(),
                location: {
                    type: 'Point',
                    coordinates: [200, 100] // Invalid coordinates
                }
            };

            const response = await request(app)
                .post('/api/v1/restaurants')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidLocationData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/v1/restaurants', () => {
        beforeEach(async () => {
            // Create test restaurants
            const baseRestaurant = testDataFactory.restaurant();
            await Restaurant.create([
                {
                    ...baseRestaurant,
                    name: 'Restaurant 1',
                    owner: testUserId,
                    location: { type: 'Point', coordinates: [-118.2437, 34.0522] }
                },
                {
                    ...baseRestaurant,
                    name: 'Restaurant 2',
                    owner: testUserId,
                    location: { type: 'Point', coordinates: [-118.2500, 34.0600] }
                }
            ]);
        });

        it('should get all restaurants', async () => {
            const response = await request(app)
                .get('/api/v1/restaurants')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.pagination).toBeDefined();
        });

        it('should support pagination', async () => {
            const response = await request(app)
                .get('/api/v1/restaurants?page=1&limit=1')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(1);
        });

        it('should filter by cuisine', async () => {
            const response = await request(app)
                .get('/api/v1/restaurants?cuisine=mediterranean')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
        });

        it('should search by location', async () => {
            const response = await request(app)
                .get('/api/v1/restaurants?lat=34.0522&lng=-118.2437&radius=10')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
        });
    });

    describe('GET /api/v1/restaurants/:id', () => {
        beforeEach(async () => {
            const restaurant = await Restaurant.create({
                ...testDataFactory.restaurant(),
                owner: testUserId
            });
            restaurantId = restaurant._id.toString();
        });

        it('should get restaurant by ID', async () => {
            const response = await request(app)
                .get(`/api/v1/restaurants/${restaurantId}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data._id).toBe(restaurantId);
            expect(response.body.data.name).toBe(testDataFactory.restaurant().name);
        });

        it('should return 404 for non-existent restaurant', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            
            const response = await request(app)
                .get(`/api/v1/restaurants/${fakeId}`)
                .expect(404);

            expect(response.body.success).toBe(false);
        });

        it('should return 400 for invalid ID format', async () => {
            const response = await request(app)
                .get('/api/v1/restaurants/invalid-id')
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/v1/restaurants/:id', () => {
        beforeEach(async () => {
            const restaurant = await Restaurant.create({
                ...testDataFactory.restaurant(),
                owner: testUserId
            });
            restaurantId = restaurant._id.toString();
        });

        it('should update restaurant by owner', async () => {
            const updateData = {
                name: 'Updated Restaurant Name',
                description: 'Updated description'
            };

            const response = await request(app)
                .put(`/api/v1/restaurants/${restaurantId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe(updateData.name);
            expect(response.body.data.description).toBe(updateData.description);
        });

        it('should return 401 without authentication', async () => {
            const updateData = { name: 'Updated Name' };

            await request(app)
                .put(`/api/v1/restaurants/${restaurantId}`)
                .send(updateData)
                .expect(401);
        });

        it('should return 403 for non-owner', async () => {
            // Create another user
            const anotherUser = await createTestUser('another@test.com');
            const anotherToken = generateAuthToken(anotherUser._id.toString());

            const updateData = { name: 'Updated Name' };

            const response = await request(app)
                .put(`/api/v1/restaurants/${restaurantId}`)
                .set('Authorization', `Bearer ${anotherToken}`)
                .send(updateData)
                .expect(403);

            expect(response.body.success).toBe(false);
        });
    });

    describe('DELETE /api/v1/restaurants/:id', () => {
        beforeEach(async () => {
            const restaurant = await Restaurant.create({
                ...testDataFactory.restaurant(),
                owner: testUserId
            });
            restaurantId = restaurant._id.toString();
        });

        it('should delete restaurant by owner', async () => {
            const response = await request(app)
                .delete(`/api/v1/restaurants/${restaurantId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);

            // Verify restaurant is deleted
            const deletedRestaurant = await Restaurant.findById(restaurantId);
            expect(deletedRestaurant).toBeNull();
        });

        it('should return 401 without authentication', async () => {
            await request(app)
                .delete(`/api/v1/restaurants/${restaurantId}`)
                .expect(401);
        });

        it('should return 403 for non-owner', async () => {
            const anotherUser = await createTestUser('another2@test.com');
            const anotherToken = generateAuthToken(anotherUser._id.toString());

            const response = await request(app)
                .delete(`/api/v1/restaurants/${restaurantId}`)
                .set('Authorization', `Bearer ${anotherToken}`)
                .expect(403);

            expect(response.body.success).toBe(false);
        });
    });

    describe('Restaurant Search and Filtering', () => {
        beforeEach(async () => {
            await Restaurant.create([
                {
                    ...testDataFactory.restaurant(),
                    name: 'Vegan Paradise',
                    cuisine: ['mediterranean', 'italian'],
                    priceRange: '$$$',
                    owner: testUserId,
                    location: { type: 'Point', coordinates: [-118.2437, 34.0522] }
                },
                {
                    ...testDataFactory.restaurant(),
                    name: 'Plant Based Bistro',
                    cuisine: ['american', 'mexican'],
                    priceRange: '$$',
                    owner: testUserId,
                    location: { type: 'Point', coordinates: [-118.2500, 34.0600] }
                }
            ]);
        });

        it('should search restaurants by name', async () => {
            const response = await request(app)
                .get('/api/v1/restaurants?search=Paradise')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].name).toContain('Paradise');
        });

        it('should filter by price range', async () => {
            const response = await request(app)
                .get('/api/v1/restaurants?priceRange=$$')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].priceRange).toBe('$$');
        });

        it('should sort restaurants', async () => {
            const response = await request(app)
                .get('/api/v1/restaurants?sort=-name')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.data[0].name).toBe('Vegan Paradise');
        });
    });

    describe('Restaurant Cache Integration', () => {
        it('should utilize cache for repeated requests', async () => {
            // Create a restaurant
            const restaurant = await Restaurant.create({
                ...testDataFactory.restaurant(),
                owner: testUserId
            });

            // First request
            const response1 = await request(app)
                .get(`/api/v1/restaurants/${restaurant._id}`)
                .expect(200);

            // Second request (should be cached)
            const response2 = await request(app)
                .get(`/api/v1/restaurants/${restaurant._id}`)
                .expect(200);

            expect(response1.body.data).toEqual(response2.body.data);
        });
    });
});