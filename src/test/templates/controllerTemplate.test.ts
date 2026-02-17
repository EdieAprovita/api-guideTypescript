/**
 * Controller Test Template - Vitest Migration Best Practices
 *
 * This template demonstrates:
 * 1. Proper authentication flow testing
 * 2. CRUD operations aligned with API routes
 * 3. Error handling and edge cases
 * 4. Service layer integration
 * 5. Validation testing
 *
 * Usage: Copy this template and modify for your specific controller
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { faker } from '@faker-js/faker';

// ===== MOCK CONFIGURATION =====
// Mock the specific services used by your controller
vi.mock('../../services/YourEntityService', () => ({
    yourEntityService: {
        // Standard CRUD methods
        getAll: vi.fn(),
        getAllCached: vi.fn(),
        findById: vi.fn(),
        findByIdCached: vi.fn(),
        create: vi.fn(),
        createCached: vi.fn(),
        updateById: vi.fn(),
        updateByIdCached: vi.fn(),
        deleteById: vi.fn(),
        // Add any specific methods for your entity
        addCustomMethod: vi.fn(),
    },
}));

// Mock related services if needed
vi.mock('../../services/ReviewService', () => ({
    reviewService: {
        addReview: vi.fn(),
        getTopRatedReviews: vi.fn(),
    },
}));

// Import services after mocking
import { yourEntityService } from '../../services/YourEntityService.js';
import { reviewService } from '../../services/ReviewService.js';

// ===== TEST DATA HELPERS =====
const createMockEntity = (overrides = {}) => ({
    _id: faker.database.mongodbObjectId(),
    name: faker.company.name(),
    author: faker.database.mongodbObjectId(),
    email: faker.internet.email(),
    description: faker.lorem.paragraph(),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

const createValidEntityData = () => ({
    name: faker.company.name(),
    email: faker.internet.email(),
    description: faker.lorem.paragraph(),
    // Add required fields for your entity
});

const createInvalidEntityData = () => ({
    name: '', // Invalid: empty name
    email: 'invalid-email', // Invalid: malformed email
    // Add fields that should fail validation
});

// ===== TEST SUITE =====
describe('YourEntity Controllers Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Reset validation mocks to default (passing) state
        const { validationResult } = require('express-validator');
        if (validationResult && typeof validationResult.mockReturnValue === 'function') {
            validationResult.mockReturnValue({
                isEmpty: () => true,
                array: () => [],
            });
        }
    });

    // ===== PUBLIC ENDPOINTS =====
    describe('GET /api/v1/entities - Get all entities (Public)', () => {
        it('should successfully fetch all entities', async () => {
            const mockEntities = [createMockEntity(), createMockEntity()];

            (yourEntityService.getAllCached as Mock).mockResolvedValue(mockEntities);

            const response = await request(app)
                .get('/api/v1/entities')
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1');

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                success: true,
                message: expect.any(String),
                data: expect.arrayContaining([
                    expect.objectContaining({
                        _id: expect.any(String),
                        name: expect.any(String),
                    }),
                ]),
            });
            expect(yourEntityService.getAllCached).toHaveBeenCalled();
        });

        it('should handle empty entity list', async () => {
            (yourEntityService.getAllCached as Mock).mockResolvedValue([]);

            const response = await request(app)
                .get('/api/v1/entities')
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1');

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual([]);
        });

        it('should handle service errors gracefully', async () => {
            (yourEntityService.getAllCached as Mock).mockRejectedValue(new Error('Database connection failed'));

            const response = await request(app)
                .get('/api/v1/entities')
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1');

            expect(response.status).toBe(404);
            expect(response.body).toMatchObject({
                success: false,
                error: expect.any(String),
            });
        });
    });

    describe('GET /api/v1/entities/:id - Get entity by ID (Public)', () => {
        it('should successfully fetch entity by ID', async () => {
            const mockEntity = createMockEntity();

            (yourEntityService.findByIdCached as Mock).mockResolvedValue(mockEntity);

            const response = await request(app)
                .get(`/api/v1/entities/${mockEntity._id}`)
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1');

            expect(response.status).toBe(200);
            expect(response.body.data).toMatchObject({
                _id: mockEntity._id,
                name: mockEntity.name,
            });
            expect(yourEntityService.findByIdCached).toHaveBeenCalledWith(mockEntity._id);
        });

        it('should handle non-existent entity ID', async () => {
            const fakeId = faker.database.mongodbObjectId();
            (yourEntityService.findByIdCached as Mock).mockRejectedValue(new Error('Entity not found'));

            const response = await request(app)
                .get(`/api/v1/entities/${fakeId}`)
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1');

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    // ===== PROTECTED ENDPOINTS (require authentication) =====
    describe('POST /api/v1/entities - Create entity (Protected)', () => {
        it('should successfully create entity with authentication', async () => {
            const entityData = createValidEntityData();
            const mockCreatedEntity = createMockEntity(entityData);

            (yourEntityService.create as Mock).mockResolvedValue(mockCreatedEntity);

            const response = await request(app)
                .post('/api/v1/entities')
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1')
                .send(entityData);

            expect(response.status).toBe(201);
            expect(response.body).toMatchObject({
                success: true,
                message: expect.stringContaining('created'),
                data: expect.objectContaining({
                    name: entityData.name,
                }),
            });
            expect(yourEntityService.create).toHaveBeenCalledWith(expect.objectContaining(entityData));
        });

        it('should handle validation errors', async () => {
            const invalidData = createInvalidEntityData();

            // Mock validation to fail
            const { validationResult } = require('express-validator');
            validationResult.mockReturnValue({
                isEmpty: () => false,
                array: () => [
                    { msg: 'Name is required', param: 'name', value: '' },
                    { msg: 'Valid email is required', param: 'email', value: 'invalid-email' },
                ],
            });

            const response = await request(app)
                .post('/api/v1/entities')
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1')
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body).toMatchObject({
                success: false,
                error: expect.stringContaining('Validation error'),
            });
        });

        it('should handle service errors during creation', async () => {
            const entityData = createValidEntityData();

            (yourEntityService.create as Mock).mockRejectedValue(new Error('Database constraint violation'));

            const response = await request(app)
                .post('/api/v1/entities')
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1')
                .send(entityData);

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
        });
    });

    // ===== ADMIN-ONLY ENDPOINTS (require admin role) =====
    describe('PUT /api/v1/entities/:id - Update entity (Protected + Admin)', () => {
        it('should successfully update entity with admin privileges', async () => {
            const entityId = faker.database.mongodbObjectId();
            const updateData = {
                name: 'Updated Entity Name',
                description: 'Updated description',
            };
            const mockUpdatedEntity = createMockEntity({
                _id: entityId,
                ...updateData,
            });

            (yourEntityService.updateById as Mock).mockResolvedValue(mockUpdatedEntity);

            const response = await request(app)
                .put(`/api/v1/entities/${entityId}`)
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1')
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                success: true,
                message: expect.stringContaining('updated'),
                data: expect.objectContaining({
                    name: updateData.name,
                    description: updateData.description,
                }),
            });
            expect(yourEntityService.updateById).toHaveBeenCalledWith(entityId, expect.objectContaining(updateData));
        });
    });

    describe('DELETE /api/v1/entities/:id - Delete entity (Protected + Admin)', () => {
        it('should successfully delete entity with admin privileges', async () => {
            const entityId = faker.database.mongodbObjectId();

            (yourEntityService.deleteById as Mock).mockResolvedValue(undefined);

            const response = await request(app)
                .delete(`/api/v1/entities/${entityId}`)
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1');

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                success: true,
                message: expect.stringContaining('deleted'),
            });
            expect(yourEntityService.deleteById).toHaveBeenCalledWith(entityId);
        });
    });

    // ===== REVIEW ENDPOINTS (if applicable) =====
    describe('POST /api/v1/entities/:id/reviews - Add review (Protected)', () => {
        it('should successfully add review to entity', async () => {
            const entityId = faker.database.mongodbObjectId();
            const reviewData = {
                rating: 5,
                title: 'Great entity!',
                content: 'Excellent service.',
                visitDate: new Date().toISOString(),
            };
            const mockReview = {
                _id: faker.database.mongodbObjectId(),
                ...reviewData,
                entityId,
                author: faker.database.mongodbObjectId(),
            };

            (reviewService.addReview as Mock).mockResolvedValue(mockReview);

            const response = await request(app)
                .post(`/api/v1/entities/${entityId}/reviews`)
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1')
                .send(reviewData);

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                success: true,
                message: expect.stringContaining('Review added'),
                data: expect.objectContaining({
                    rating: reviewData.rating,
                    title: reviewData.title,
                }),
            });
            expect(reviewService.addReview).toHaveBeenCalledWith({
                ...reviewData,
                entityId,
            });
        });
    });

    // ===== INTEGRATION TESTS =====
    describe('Service Layer Integration', () => {
        it('should use cached methods for better performance', async () => {
            const mockEntities = [createMockEntity()];
            (yourEntityService.getAllCached as Mock).mockResolvedValue(mockEntities);

            await request(app).get('/api/v1/entities').set('User-Agent', 'test-agent').set('API-Version', 'v1');

            // Verify that cached method is used instead of regular getAll
            expect(yourEntityService.getAllCached).toHaveBeenCalled();
            expect(yourEntityService.getAll).not.toHaveBeenCalled();
        });

        it('should handle concurrent requests properly', async () => {
            const mockEntity = createMockEntity();
            (yourEntityService.findByIdCached as Mock).mockResolvedValue(mockEntity);

            // Simulate concurrent requests
            const requests = Array(3)
                .fill(null)
                .map(() =>
                    request(app)
                        .get(`/api/v1/entities/${mockEntity._id}`)
                        .set('User-Agent', 'test-agent')
                        .set('API-Version', 'v1')
                );

            const responses = await Promise.all(requests);

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.data._id).toBe(mockEntity._id);
            });
        });
    });

    // ===== EDGE CASES AND ERROR SCENARIOS =====
    describe('Edge Cases', () => {
        it('should handle malformed request data', async () => {
            const response = await request(app)
                .post('/api/v1/entities')
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1')
                .set('Content-Type', 'application/json')
                .send('invalid json');

            expect(response.status).toBe(400);
        });

        it('should handle missing required headers', async () => {
            const response = await request(app).get('/api/v1/entities');

            // Should still work for public endpoints, but might have warnings
            expect([200, 400]).toContain(response.status);
        });

        it('should respect rate limiting', async () => {
            // This test would need specific rate limiting configuration
            const mockEntity = createMockEntity();
            (yourEntityService.findByIdCached as Mock).mockResolvedValue(mockEntity);

            const response = await request(app)
                .get(`/api/v1/entities/${mockEntity._id}`)
                .set('User-Agent', 'test-agent')
                .set('API-Version', 'v1');

            expect(response.status).toBe(200);
        });
    });
});

/**
 * CHECKLIST FOR USING THIS TEMPLATE:
 *
 * 1. Replace 'YourEntity' with your actual entity name (e.g., 'Business', 'Restaurant')
 * 2. Replace '/entities' with your actual route path
 * 3. Update mock service methods to match your service
 * 4. Customize createMockEntity() with your entity's fields
 * 5. Update createValidEntityData() with required fields
 * 6. Adjust expected status codes based on your controller's error handling
 * 7. Add any entity-specific test cases
 * 8. Update validation error scenarios to match your validation rules
 * 9. Test your specific middleware requirements (auth, admin, etc.)
 * 10. Verify that all imports point to correct file paths
 */
