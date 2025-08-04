import { describe, it, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../app';
import {
    generateTestData,
    makeRequest,
    expectResponse,
    createServiceMock,
    generateCrudTests,
    resetAllMocks,
} from '../utils/unified-test-helpers';

// ============================================================================
// MOCKS
// ============================================================================

// Mock the BusinessService
const mockBusinessService = createServiceMock([
    generateTestData.business({ namePlace: 'Test Business 1' }),
    generateTestData.business({ namePlace: 'Test Business 2' }),
]);

vi.mock('../../services/BusinessService', () => ({
    businessService: mockBusinessService,
}));

// Mock geocoding utility
vi.mock('../../utils/geocodeLocation', () => ({
    default: vi.fn().mockResolvedValue(undefined),
}));

// ============================================================================
// TESTS
// ============================================================================

describe('Business Controllers', () => {
    beforeEach(() => {
        resetAllMocks();
    });

    // ============================================================================
    // CRUD TESTS (Auto-generated)
    // ============================================================================

    const crudTests = generateCrudTests({
        app,
        basePath: '/api/v1/businesses',
        serviceMock: mockBusinessService,
        validData: {
            namePlace: 'New Business',
            address: '123 Test Street',
            typeBusiness: 'restaurant',
            budget: 2,
            contact: [
                {
                    phone: '+1234567890',
                    email: 'test@business.com',
                },
            ],
        },
        updateData: {
            namePlace: 'Updated Business',
            budget: 3,
        },
        resourceName: 'business',
    });

    // Run all CRUD tests
    crudTests.runAllTests();

    // ============================================================================
    // CUSTOM BUSINESS LOGIC TESTS
    // ============================================================================

    describe('Business-specific operations', () => {
        it('should get top rated businesses', async () => {
            const mockTopBusinesses = [
                generateTestData.business({ rating: 5, numReviews: 10 }),
                generateTestData.business({ rating: 4.8, numReviews: 8 }),
            ];

            // Mock ReviewService for top-rated endpoint
            vi.doMock('../../services/ReviewService', () => ({
                reviewService: {
                    getTopRatedReviews: vi.fn().mockResolvedValue(mockTopBusinesses),
                },
            }));

            const response = await makeRequest.get(app, '/api/v1/businesses/top-rated');

            expectResponse.success(response);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.data[0].rating).toBe(5);
        });

        it('should add review to business', async () => {
            const businessId = generateTestData.business()._id;
            const reviewData = {
                rating: 5,
                title: 'Great business!',
                content: 'Really enjoyed my visit.',
            };

            // Mock ReviewService
            vi.doMock('../../services/ReviewService', () => ({
                reviewService: {
                    addReview: vi.fn().mockResolvedValue({
                        _id: 'review123',
                        ...reviewData,
                        businessId,
                    }),
                },
            }));

            const response = await makeRequest.post(app, `/api/v1/businesses/${businessId}/reviews`, reviewData);

            expectResponse.success(response);
            expect(response.body.message).toBe('Review added successfully');
        });
    });

    // ============================================================================
    // ERROR HANDLING TESTS
    // ============================================================================

    describe('Error handling', () => {
        it('should handle missing business ID', async () => {
            const response = await makeRequest.get(app, '/api/v1/businesses/');
            expectResponse.error(response, 404);
        });

        it('should handle service errors', async () => {
            mockBusinessService.getAll.mockRejectedValue(new Error('Database connection failed'));

            const response = await makeRequest.get(app, '/api/v1/businesses');
            expectResponse.error(response, 404);
        });

        it('should validate required fields on create', async () => {
            const invalidData = {
                // Missing required namePlace
                address: '123 Test Street',
            };

            const response = await makeRequest.post(app, '/api/v1/businesses', invalidData);
            expectResponse.validation(response);
        });
    });

    // ============================================================================
    // AUTHENTICATION TESTS
    // ============================================================================

    describe('Authentication', () => {
        it('should allow public access to GET endpoints', async () => {
            const response = await makeRequest.get(app, '/api/v1/businesses');
            expectResponse.success(response);
        });

        // Note: Authentication tests would require auth token
        // This can be extended based on your auth requirements
    });
});

// ============================================================================
// INTEGRATION TESTS (Optional - separate file recommended)
// ============================================================================

describe('Business Controllers Integration', () => {
    // These would typically be in a separate .integration.test.ts file
    // and would use real database connections

    it.skip('should create business with real database', async () => {
        // Integration test implementation
        // Uses configureTest({ type: 'integration' })
    });
});
