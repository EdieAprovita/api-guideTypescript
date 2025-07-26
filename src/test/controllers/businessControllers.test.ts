import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { faker } from '@faker-js/faker';

// Mock services - these will be auto-mocked by the global setup
vi.mock('../../services/BusinessService', () => ({
    businessService: {
        getAll: vi.fn(),
        getAllCached: vi.fn(),
        findById: vi.fn(),
        findByIdCached: vi.fn(),
        create: vi.fn(),
        createCached: vi.fn(),
        updateById: vi.fn(),
        updateByIdCached: vi.fn(),
        deleteById: vi.fn(),
    },
}));

vi.mock('../../services/ReviewService', () => ({
    reviewService: {
        addReview: vi.fn(),
        getTopRatedReviews: vi.fn(),
    },
}));

// Import after mocks are defined
import { businessService } from '../../services/BusinessService';
import { reviewService } from '../../services/ReviewService';

// Test data helpers
const createMockBusiness = (overrides = {}) => ({
    _id: faker.database.mongodbObjectId(),
    namePlace: faker.company.name(),
    author: faker.database.mongodbObjectId(),
    address: faker.location.streetAddress(),
    location: {
        type: 'Point',
        coordinates: [faker.location.longitude(), faker.location.latitude()],
    },
    image: faker.image.url(),
    contact: [
        {
            phone: faker.phone.number(),
            email: faker.internet.email(),
            facebook: faker.internet.url(),
            instagram: faker.internet.url(),
        },
    ],
    budget: faker.number.int({ min: 100, max: 10000 }),
    typeBusiness: faker.helpers.arrayElement(['restaurant', 'retail', 'service', 'office']),
    hours: [
        {
            dayOfWeek: 'Monday',
            openTime: '09:00',
            closeTime: '18:00',
        },
    ],
    reviews: [],
    rating: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
    numReviews: faker.number.int({ min: 0, max: 100 }),
    timestamps: {
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    ...overrides,
});

const createValidBusinessData = () => ({
    namePlace: faker.company.name(),
    address: faker.location.streetAddress(),
    image: faker.image.url(),
    contact: [
        {
            phone: faker.phone.number(),
            email: faker.internet.email(),
        },
    ],
    budget: faker.number.int({ min: 100, max: 10000 }),
    typeBusiness: 'retail',
    hours: [
        {
            dayOfWeek: 'Monday',
            openTime: '09:00',
            closeTime: '18:00',
        },
    ],
});

describe('Business Controllers Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/v1/businesses - Get all businesses (Public)', () => {
        it('should successfully fetch all businesses', async () => {
            const mockBusinesses = [createMockBusiness(), createMockBusiness()];

            (businessService.getAllCached as Mock).mockResolvedValue(mockBusinesses);

            const response = await request(app)
                .get('/api/v1/businesses')
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1');

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                success: true,
                message: 'Businesses fetched successfully',
                data: expect.arrayContaining([
                    expect.objectContaining({
                        _id: expect.any(String),
                        namePlace: expect.any(String),
                    }),
                ]),
            });
            expect(businessService.getAllCached).toHaveBeenCalled();
        });

        it('should handle empty business list', async () => {
            (businessService.getAllCached as Mock).mockResolvedValue([]);

            const response = await request(app)
                .get('/api/v1/businesses')
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1');

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                success: true,
                message: 'Businesses fetched successfully',
                data: [],
            });
        });
    });

    describe('GET /api/v1/businesses/:id - Get business by ID (Public)', () => {
        it('should successfully fetch business by ID', async () => {
            const mockBusiness = createMockBusiness();

            (businessService.findByIdCached as Mock).mockResolvedValue(mockBusiness);

            const response = await request(app)
                .get(`/api/v1/businesses/${mockBusiness._id}`)
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1');

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                success: true,
                message: 'Business fetched successfully',
                data: expect.objectContaining({
                    _id: mockBusiness._id,
                    namePlace: mockBusiness.namePlace,
                }),
            });
            expect(businessService.findByIdCached).toHaveBeenCalledWith(mockBusiness._id);
        });

        it('should handle non-existent business ID', async () => {
            const fakeId = faker.database.mongodbObjectId();
            (businessService.findByIdCached as Mock).mockRejectedValue(new Error('Business not found'));

            const response = await request(app)
                .get(`/api/v1/businesses/${fakeId}`)
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1');

            expect(response.status).toBe(404);
            expect(response.body).toMatchObject({
                success: false,
                error: expect.any(String),
            });
        });
    });

    describe('POST /api/v1/businesses - Create business (Protected)', () => {
        it('should successfully create a business with valid data', async () => {
            const businessData = createValidBusinessData();
            const mockCreatedBusiness = createMockBusiness(businessData);

            (businessService.create as Mock).mockResolvedValue(mockCreatedBusiness);

            const response = await request(app)
                .post('/api/v1/businesses')
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1')
                .send(businessData);

            expect(response.status).toBe(201);
            expect(response.body).toMatchObject({
                success: true,
                message: 'Business created successfully',
                data: expect.objectContaining({
                    namePlace: businessData.namePlace,
                    typeBusiness: businessData.typeBusiness,
                }),
            });
            expect(businessService.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    ...businessData,
                    location: expect.objectContaining({
                        type: 'Point',
                        coordinates: expect.any(Array),
                    }),
                })
            );
        });

        it('should create business with geocoded location', async () => {
            const businessData = createValidBusinessData();
            const mockCreatedBusiness = createMockBusiness({
                ...businessData,
                location: {
                    type: 'Point',
                    coordinates: [-74.006, 40.7128],
                },
            });

            (businessService.create as Mock).mockResolvedValue(mockCreatedBusiness);

            const response = await request(app)
                .post('/api/v1/businesses')
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1')
                .send(businessData);

            expect(response.status).toBe(201);
            expect(businessService.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    location: {
                        type: 'Point',
                        coordinates: [-74.006, 40.7128],
                    },
                })
            );
        });

        it('should handle validation errors', async () => {
            const invalidData = {
                namePlace: '', // Invalid: empty name
                typeBusiness: 'retail',
            };

            // Mock validation to fail
            const { validationResult } = require('express-validator');
            validationResult.mockReturnValue({
                isEmpty: () => false,
                array: () => [{ msg: 'Name is required', param: 'namePlace' }],
            });

            const response = await request(app)
                .post('/api/v1/businesses')
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1')
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body).toMatchObject({
                success: false,
                error: expect.stringContaining('Validation error'),
            });
        });
    });

    describe('PUT /api/v1/businesses/:id - Update business (Protected + Admin)', () => {
        it('should successfully update business with admin privileges', async () => {
            const businessId = faker.database.mongodbObjectId();
            const updateData = {
                namePlace: 'Updated Business Name',
                budget: 5000,
            };
            const mockUpdatedBusiness = createMockBusiness({
                _id: businessId,
                ...updateData,
            });

            (businessService.updateById as Mock).mockResolvedValue(mockUpdatedBusiness);

            const response = await request(app)
                .put(`/api/v1/businesses/${businessId}`)
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1')
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                success: true,
                message: 'Business updated successfully',
                data: expect.objectContaining({
                    namePlace: updateData.namePlace,
                    budget: updateData.budget,
                }),
            });
            expect(businessService.updateById).toHaveBeenCalledWith(businessId, expect.objectContaining(updateData));
        });
    });

    describe('DELETE /api/v1/businesses/:id - Delete business (Protected + Admin)', () => {
        it('should successfully delete business with admin privileges', async () => {
            const businessId = faker.database.mongodbObjectId();

            (businessService.deleteById as Mock).mockResolvedValue(undefined);

            const response = await request(app)
                .delete(`/api/v1/businesses/${businessId}`)
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1');

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                success: true,
                message: 'Business deleted successfully',
            });
            expect(businessService.deleteById).toHaveBeenCalledWith(businessId);
        });
    });

    describe('POST /api/v1/businesses/add-review/:id - Add review (Protected)', () => {
        it('should successfully add review to business', async () => {
            const businessId = faker.database.mongodbObjectId();
            const reviewData = {
                rating: 5,
                title: 'Great business!',
                content: 'Excellent service and products.',
                visitDate: new Date().toISOString(),
            };
            const mockReview = {
                _id: faker.database.mongodbObjectId(),
                ...reviewData,
                businessId,
                author: faker.database.mongodbObjectId(),
            };

            (reviewService.addReview as Mock).mockResolvedValue(mockReview);

            const response = await request(app)
                .post(`/api/v1/businesses/add-review/${businessId}`)
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1')
                .send(reviewData);

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                success: true,
                message: 'Review added successfully',
                data: expect.objectContaining({
                    rating: reviewData.rating,
                    title: reviewData.title,
                    businessId,
                }),
            });
            expect(reviewService.addReview).toHaveBeenCalledWith({
                ...reviewData,
                businessId,
            });
        });
    });

    describe('Service Layer Integration', () => {
        it('should handle service errors gracefully', async () => {
            (businessService.getAllCached as Mock).mockRejectedValue(new Error('Database connection failed'));

            const response = await request(app)
                .get('/api/v1/businesses')
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1');

            expect(response.status).toBe(404);
            expect(response.body).toMatchObject({
                success: false,
                error: expect.any(String),
            });
        });

        it('should use cached methods for better performance', async () => {
            const mockBusinesses = [createMockBusiness()];
            (businessService.getAllCached as Mock).mockResolvedValue(mockBusinesses);

            await request(app).get('/api/v1/businesses').set('User-Agent', 'test-agent').set('API-Version', 'v1');

            // Verify that cached method is used instead of regular getAll
            expect(businessService.getAllCached).toHaveBeenCalled();
            expect(businessService.getAll).not.toHaveBeenCalled();
        });
    });
});
