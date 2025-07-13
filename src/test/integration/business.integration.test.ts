import request from 'supertest';
import app from '../../app';
import { setupTestDb, teardownTestDb } from './helpers/testDb';
import { createTestUser, generateAuthToken } from './helpers/authHelper';
import { Business } from '../../models/Business';
import { testDataFactory } from '../types/testTypes';

describe('Business Integration Tests', () => {
    let authToken: string;
    let testUserId: string;
    let businessId: string;

    const validBusinessData = {
        ...testDataFactory.business(),
        name: 'Vegan Health Store',
        description: 'Your one-stop shop for vegan products',
        phone: '+1-555-987-6543',
        email: 'info@veganhealthstore.com',
        website: 'https://veganhealthstore.com',
        address: {
            street: '789 Health Avenue',
            city: 'Wellness City',
            state: 'California',
            country: 'USA',
            zipCode: '90301'
        },
        category: 'health-store',
        subcategory: 'supplements',
        features: ['delivery', 'online-ordering', 'loyalty-program']
    };

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
        await Business.deleteMany({});
    });

    describe('POST /api/v1/businesses', () => {
        it('should create a new business with valid data', async () => {
            const response = await request(app)
                .post('/api/v1/businesses')
                .set('Authorization', `Bearer ${authToken}`)
                .send(validBusinessData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('_id');
            expect(response.body.data.name).toBe(validBusinessData.name);
            expect(response.body.data.owner).toBe(testUserId);
            expect(response.body.data.status).toBe('pending');
            
            businessId = response.body.data._id;
        });

        it('should return 400 for missing required fields', async () => {
            const invalidData = { ...validBusinessData };
            delete (invalidData as Partial<typeof validBusinessData>).name;
            
            const response = await request(app)
                .post('/api/v1/businesses')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('validation');
        });

        it('should return 401 without authentication', async () => {
            await request(app)
                .post('/api/v1/businesses')
                .send(validBusinessData)
                .expect(401);
        });

        it('should validate email format', async () => {
            const invalidEmailData = {
                ...validBusinessData,
                email: 'invalid-email'
            };

            const response = await request(app)
                .post('/api/v1/businesses')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidEmailData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should validate phone format', async () => {
            const invalidPhoneData = {
                ...validBusinessData,
                phone: '123'
            };

            const response = await request(app)
                .post('/api/v1/businesses')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidPhoneData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/v1/businesses', () => {
        beforeEach(async () => {
            await Business.create([
                {
                    ...validBusinessData,
                    name: 'Business 1',
                    category: 'health-store',
                    owner: testUserId,
                    status: 'approved'
                },
                {
                    ...validBusinessData,
                    name: 'Business 2',
                    category: 'cafe',
                    owner: testUserId,
                    status: 'approved'
                },
                {
                    ...validBusinessData,
                    name: 'Pending Business',
                    category: 'restaurant',
                    owner: testUserId,
                    status: 'pending'
                }
            ]);
        });

        it('should get all approved businesses', async () => {
            const response = await request(app)
                .get('/api/v1/businesses')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2); // Only approved businesses
            expect(response.body.pagination).toBeDefined();
        });

        it('should filter by category', async () => {
            const response = await request(app)
                .get('/api/v1/businesses?category=health-store')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].category).toBe('health-store');
        });

        it('should search by location with radius', async () => {
            const response = await request(app)
                .get('/api/v1/businesses?lat=34.0522&lng=-118.2437&radius=5')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
        });

        it('should support pagination', async () => {
            const response = await request(app)
                .get('/api/v1/businesses?page=1&limit=1')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(1);
        });

        it('should search by name', async () => {
            const response = await request(app)
                .get('/api/v1/businesses?search=Business 1')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].name).toContain('Business 1');
        });
    });

    describe('GET /api/v1/businesses/:id', () => {
        beforeEach(async () => {
            const business = await Business.create({
                ...validBusinessData,
                owner: testUserId,
                status: 'approved'
            });
            businessId = business._id.toString();
        });

        it('should get business by ID', async () => {
            const response = await request(app)
                .get(`/api/v1/businesses/${businessId}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data._id).toBe(businessId);
            expect(response.body.data.name).toBe(validBusinessData.name);
        });

        it('should return 404 for non-existent business', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            
            const response = await request(app)
                .get(`/api/v1/businesses/${fakeId}`)
                .expect(404);

            expect(response.body.success).toBe(false);
        });

        it('should return 400 for invalid ID format', async () => {
            const response = await request(app)
                .get('/api/v1/businesses/invalid-id')
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/v1/businesses/:id', () => {
        beforeEach(async () => {
            const business = await Business.create({
                ...validBusinessData,
                owner: testUserId,
                status: 'approved'
            });
            businessId = business._id.toString();
        });

        it('should update business by owner', async () => {
            const updateData = {
                name: 'Updated Business Name',
                description: 'Updated description',
                phone: '+1-555-111-2222'
            };

            const response = await request(app)
                .put(`/api/v1/businesses/${businessId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe(updateData.name);
            expect(response.body.data.description).toBe(updateData.description);
            expect(response.body.data.phone).toBe(updateData.phone);
        });

        it('should return 401 without authentication', async () => {
            const updateData = { name: 'Updated Name' };

            await request(app)
                .put(`/api/v1/businesses/${businessId}`)
                .send(updateData)
                .expect(401);
        });

        it('should return 403 for non-owner', async () => {
            const anotherUser = await createTestUser('another@test.com');
            const anotherToken = generateAuthToken(anotherUser._id.toString());

            const updateData = { name: 'Updated Name' };

            const response = await request(app)
                .put(`/api/v1/businesses/${businessId}`)
                .set('Authorization', `Bearer ${anotherToken}`)
                .send(updateData)
                .expect(403);

            expect(response.body.success).toBe(false);
        });

        it('should validate updated data', async () => {
            const invalidUpdateData = {
                email: 'invalid-email-format'
            };

            const response = await request(app)
                .put(`/api/v1/businesses/${businessId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidUpdateData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('DELETE /api/v1/businesses/:id', () => {
        beforeEach(async () => {
            const business = await Business.create({
                ...validBusinessData,
                owner: testUserId,
                status: 'approved'
            });
            businessId = business._id.toString();
        });

        it('should delete business by owner', async () => {
            const response = await request(app)
                .delete(`/api/v1/businesses/${businessId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);

            // Verify business is deleted
            const deletedBusiness = await Business.findById(businessId);
            expect(deletedBusiness).toBeNull();
        });

        it('should return 401 without authentication', async () => {
            await request(app)
                .delete(`/api/v1/businesses/${businessId}`)
                .expect(401);
        });

        it('should return 403 for non-owner', async () => {
            const anotherUser = await createTestUser('another2@test.com');
            const anotherToken = generateAuthToken(anotherUser._id.toString());

            const response = await request(app)
                .delete(`/api/v1/businesses/${businessId}`)
                .set('Authorization', `Bearer ${anotherToken}`)
                .expect(403);

            expect(response.body.success).toBe(false);
        });
    });

    describe('Business Nearby Search', () => {
        beforeEach(async () => {
            await Business.create([
                {
                    ...validBusinessData,
                    name: 'Nearby Business 1',
                    owner: testUserId,
                    status: 'approved',
                    location: { type: 'Point', coordinates: [-118.2437, 34.0522] } // LA
                },
                {
                    ...validBusinessData,
                    name: 'Nearby Business 2',
                    owner: testUserId,
                    status: 'approved',
                    location: { type: 'Point', coordinates: [-118.2500, 34.0600] } // Close to LA
                },
                {
                    ...validBusinessData,
                    name: 'Far Business',
                    owner: testUserId,
                    status: 'approved',
                    location: { type: 'Point', coordinates: [-122.4194, 37.7749] } // San Francisco
                }
            ]);
        });

        it('should find businesses within radius', async () => {
            const response = await request(app)
                .get('/api/v1/businesses/nearby?lat=34.0522&lng=-118.2437&radius=10')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBe(2); // Only nearby businesses
        });

        it('should return distance in nearby search', async () => {
            const response = await request(app)
                .get('/api/v1/businesses/nearby?lat=34.0522&lng=-118.2437&radius=10')
                .expect(200);

            expect(response.body.success).toBe(true);
            response.body.data.forEach((business: { distance: number }) => {
                expect(business).toHaveProperty('distance');
                expect(typeof business.distance).toBe('number');
            });
        });

        it('should validate coordinates for nearby search', async () => {
            const response = await request(app)
                .get('/api/v1/businesses/nearby?lat=invalid&lng=-118.2437&radius=10')
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should require all parameters for nearby search', async () => {
            const response = await request(app)
                .get('/api/v1/businesses/nearby?lat=34.0522&lng=-118.2437')
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('Business Categories and Filtering', () => {
        beforeEach(async () => {
            await Business.create([
                {
                    ...validBusinessData,
                    name: 'Health Store A',
                    category: 'health-store',
                    subcategory: 'supplements',
                    owner: testUserId,
                    status: 'approved'
                },
                {
                    ...validBusinessData,
                    name: 'Cafe B',
                    category: 'cafe',
                    subcategory: 'coffee-shop',
                    owner: testUserId,
                    status: 'approved'
                },
                {
                    ...validBusinessData,
                    name: 'Health Store C',
                    category: 'health-store',
                    subcategory: 'organic-food',
                    owner: testUserId,
                    status: 'approved'
                }
            ]);
        });

        it('should filter by category', async () => {
            const response = await request(app)
                .get('/api/v1/businesses?category=health-store')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
            response.body.data.forEach((business: { category: string }) => {
                expect(business.category).toBe('health-store');
            });
        });

        it('should filter by subcategory', async () => {
            const response = await request(app)
                .get('/api/v1/businesses?subcategory=supplements')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].subcategory).toBe('supplements');
        });

        it('should combine category and subcategory filters', async () => {
            const response = await request(app)
                .get('/api/v1/businesses?category=health-store&subcategory=organic-food')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].name).toBe('Health Store C');
        });
    });

    describe('Business Status and Approval', () => {
        it('should only return approved businesses in public listing', async () => {
            await Business.create([
                { ...validBusinessData, name: 'Approved Business', status: 'approved', owner: testUserId },
                { ...validBusinessData, name: 'Pending Business', status: 'pending', owner: testUserId },
                { ...validBusinessData, name: 'Rejected Business', status: 'rejected', owner: testUserId }
            ]);

            const response = await request(app)
                .get('/api/v1/businesses')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].name).toBe('Approved Business');
        });
    });

    describe('Business Cache Integration', () => {
        it('should cache business listings', async () => {
            await Business.create({
                ...validBusinessData,
                owner: testUserId,
                status: 'approved'
            });

            // First request
            const response1 = await request(app)
                .get('/api/v1/businesses')
                .expect(200);

            // Second request (should be cached)
            const response2 = await request(app)
                .get('/api/v1/businesses')
                .expect(200);

            expect(response1.body.data).toEqual(response2.body.data);
        });
    });
});