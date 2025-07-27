import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { faker } from '@faker-js/faker';
import {
    setupMasterTest,
    generateMasterTestData,
    makeMasterRequest,
    expectMasterResponse,
    type MasterTestContext,
} from '../config/master-test-config';

// Setup master configuration for unit tests
const testHooks = setupMasterTest('unit');
let context: MasterTestContext;
let app: any;

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

// Use master test data generators
const createMockBusiness = (overrides = {}) => {
    const businessData = generateMasterTestData.business(overrides);
    return {
        ...businessData,
        reviews: [],
        rating: 0,
        numReviews: 0,
        timestamps: {
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    };
};

const createValidBusinessData = () => generateMasterTestData.business();

describe('Business Controllers Tests', () => {
    beforeEach(async () => {
        context = await testHooks.beforeEach();
        // Import app AFTER mocks are configured
        if (!app) {
            app = (await import('../../app')).default;
        }
    });

    describe('GET /api/v1/businesses - Get all businesses (Public)', () => {
        it('should successfully fetch all businesses', async () => {
            const mockBusinesses = [createMockBusiness(), createMockBusiness()];

            (businessService.getAllCached as Mock).mockResolvedValue(mockBusinesses);

            const response = await makeMasterRequest.get(
                app,
                '/api/v1/businesses'
            );

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

            const response = await makeMasterRequest.get(
                app,
                '/api/v1/businesses'
            );

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

            const response = await makeMasterRequest.get(
                app,
                `/api/v1/businesses/${mockBusiness._id}`
            );

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

            const response = await makeMasterRequest.get(
                app,
                `/api/v1/businesses/${fakeId}`
            );

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

            const response = await makeMasterRequest.post(
                app,
                '/api/v1/businesses',
                businessData,
                context.admin.token
            );

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

            const response = await makeMasterRequest.post(
                app,
                '/api/v1/businesses',
                businessData,
                context.admin.token
            );

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

            const response = await makeMasterRequest.post(
                app,
                '/api/v1/businesses',
                invalidData,
                context.admin.token
            );

            // Accept validation error responses
            expect(response.status).toBeGreaterThanOrEqual(400);
            expect(response.status).toBeLessThan(500);
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

            const response = await makeMasterRequest.put(
                app,
                `/api/v1/businesses/${businessId}`,
                updateData,
                context.admin.token
            );

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

            const response = await makeMasterRequest.delete(
                app,
                `/api/v1/businesses/${businessId}`,
                context.admin.token
            );

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

            const response = await makeMasterRequest.post(
                app,
                `/api/v1/businesses/add-review/${businessId}`,
                reviewData,
                context.admin.token
            );

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

            const response = await makeMasterRequest.get(
                app,
                '/api/v1/businesses'
            );

            expect(response.status).toBe(404);
            expect(response.body).toMatchObject({
                success: false,
                error: expect.any(String),
            });
        });

        it('should use cached methods for better performance', async () => {
            const mockBusinesses = [createMockBusiness()];
            (businessService.getAllCached as Mock).mockResolvedValue(mockBusinesses);

            await makeMasterRequest.get(app, '/api/v1/businesses');

            // Verify that cached method is used instead of regular getAll
            expect(businessService.getAllCached).toHaveBeenCalled();
            expect(businessService.getAll).not.toHaveBeenCalled();
        });
    });
});
