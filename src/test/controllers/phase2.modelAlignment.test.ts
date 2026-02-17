import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response } from 'express';
import { testUtils } from '@test/helpers/testBase';
import { HttpStatusCode } from '@/types/Errors';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('express-validator', () => ({
    __esModule: true,
    default: { validationResult: vi.fn() },
    validationResult: vi.fn(),
}));

const mockGetAll = vi.fn();
const mockFindById = vi.fn();

vi.mock('@/services/PostService.js', () => ({
    postService: {
        getAll: mockGetAll,
        findById: mockFindById,
        getAllCached: vi.fn(),
        findByIdCached: vi.fn(),
        create: vi.fn(),
        updateById: vi.fn(),
        deleteById: vi.fn(),
        likePost: vi.fn(),
        unlikePost: vi.fn(),
        addComment: vi.fn(),
        removeComment: vi.fn(),
    },
}));

const mockAddReview = vi.fn();
const mockFindByUserAndEntity = vi.fn();

vi.mock('@/services/ReviewService.js', () => ({
    reviewService: {
        addReview: mockAddReview,
        findByUserAndEntity: mockFindByUserAndEntity,
        getReviewsByEntity: vi.fn(),
        getReviewStats: vi.fn(),
        getTopRatedReviews: vi.fn(),
    },
}));

vi.mock('@/services/BusinessService.js', () => ({
    businessService: {
        getAll: vi.fn(),
        getAllCached: vi.fn(),
        findById: vi.fn().mockResolvedValue({ _id: 'biz1', namePlace: 'Test' }),
        findByIdCached: vi.fn(),
        create: vi.fn(),
        updateById: vi.fn(),
        deleteById: vi.fn(),
        findNearbyPaginated: vi.fn(),
        searchPaginated: vi.fn(),
    },
}));

vi.mock('@/utils/sanitizer.js', () => ({
    sanitizeNoSQLInput: (data: any) => data,
}));

vi.mock('@/utils/geocodeLocation.js', () => ({
    default: vi.fn(),
}));

// ============================================================================
// Phase 2 — Post Model: content virtual + populated author
// ============================================================================

describe('Phase 2 — Post model virtuals & population', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('getPosts should return populated posts with virtual content field', async () => {
        const { getPosts } = await import('@/controllers/postControllers.js');
        const mockPosts = [
            {
                _id: 'p1',
                text: 'Hello vegan world',
                content: 'Hello vegan world', // virtual
                username: { _id: 'u1', username: 'edgar', photo: 'photo.jpg' },
                likes: [],
                comments: [],
                createdAt: new Date().toISOString(),
            },
        ];
        mockGetAll.mockResolvedValue(mockPosts);

        const req = testUtils.createMockRequest() as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext();

        await getPosts(req, res, next);

        expect(mockGetAll).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.OK);
        const jsonCall = (res.json as any).mock.calls[0][0];
        expect(jsonCall.data[0].content).toBe('Hello vegan world');
        expect(jsonCall.data[0].username).toHaveProperty('username', 'edgar');
    });

    it('getPostById should return populated post with virtual content', async () => {
        const { getPostById } = await import('@/controllers/postControllers.js');
        const mockPost = {
            _id: 'p1',
            text: 'My vegan recipe',
            content: 'My vegan recipe',
            username: { _id: 'u1', username: 'edgar', photo: 'photo.jpg' },
            likes: [],
            comments: [
                {
                    id: 'c1',
                    text: 'Great post!',
                    username: { _id: 'u2', username: 'jane', photo: 'jane.jpg' },
                    date: new Date().toISOString(),
                },
            ],
            createdAt: new Date().toISOString(),
        };
        mockFindById.mockResolvedValue(mockPost);

        const req = testUtils.createMockRequest({ params: { id: '507f1f77bcf86cd799439011' } }) as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext();

        await getPostById(req, res, next);

        expect(mockFindById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.OK);
        const jsonCall = (res.json as any).mock.calls[0][0];
        expect(jsonCall.data.content).toBe('My vegan recipe');
        expect(jsonCall.data.comments[0].username).toHaveProperty('username', 'jane');
    });
});

// ============================================================================
// Phase 2 — Review: title optional + comment→content mapping
// ============================================================================

describe('Phase 2 — Review title optional & comment alias', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('reviewEndpointsFactory should map comment→content when creating review', async () => {
        const { createAddReviewHandler } = await import('@/controllers/factories/reviewEndpointsFactory.js');
        const { businessService } = await import('@/services/BusinessService.js');

        mockFindByUserAndEntity.mockResolvedValue(null);
        mockAddReview.mockResolvedValue({
            _id: 'r1',
            rating: 5,
            content: 'Amazing vegan food!',
            comment: 'Amazing vegan food!', // virtual alias
            entityType: 'Business',
            entity: 'biz1',
            author: 'testuser',
        });

        const handler = createAddReviewHandler('Business', businessService as any, 'business');

        const req = testUtils.createMockRequest({
            params: { id: 'biz1' },
            body: { rating: 5, comment: 'Amazing vegan food!' },
        }) as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext();

        await handler(req, res, next);

        expect(mockAddReview).toHaveBeenCalledWith(
            expect.objectContaining({
                content: 'Amazing vegan food!',
                rating: 5,
                entityType: 'Business',
                entity: 'biz1',
            })
        );
        // Should NOT pass `comment` to addReview (it was remapped)
        const addReviewArg = mockAddReview.mock.calls[0][0];
        expect(addReviewArg).not.toHaveProperty('comment');
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('reviewEndpointsFactory should pass content directly when provided', async () => {
        const { createAddReviewHandler } = await import('@/controllers/factories/reviewEndpointsFactory.js');
        const { businessService } = await import('@/services/BusinessService.js');

        mockFindByUserAndEntity.mockResolvedValue(null);
        mockAddReview.mockResolvedValue({
            _id: 'r2',
            rating: 4,
            content: 'Good place for vegans',
            entityType: 'Business',
            entity: 'biz1',
            author: 'testuser',
        });

        const handler = createAddReviewHandler('Business', businessService as any, 'business');

        const req = testUtils.createMockRequest({
            params: { id: 'biz1' },
            body: { rating: 4, content: 'Good place for vegans' },
        }) as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext();

        await handler(req, res, next);

        expect(mockAddReview).toHaveBeenCalledWith(
            expect.objectContaining({
                content: 'Good place for vegans',
            })
        );
    });

    it('review can be created without title (auto-generated)', async () => {
        const { createAddReviewHandler } = await import('@/controllers/factories/reviewEndpointsFactory.js');
        const { businessService } = await import('@/services/BusinessService.js');

        mockFindByUserAndEntity.mockResolvedValue(null);
        mockAddReview.mockResolvedValue({
            _id: 'r3',
            rating: 5,
            content: 'This vegan restaurant has incredible options',
            title: 'This vegan restaurant has incredible options',
            entityType: 'Business',
            entity: 'biz1',
            author: 'testuser',
        });

        const handler = createAddReviewHandler('Business', businessService as any, 'business');

        const req = testUtils.createMockRequest({
            params: { id: 'biz1' },
            body: { rating: 5, comment: 'This vegan restaurant has incredible options' },
        }) as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext();

        await handler(req, res, next);

        // Title was not sent in body
        const addReviewArg = mockAddReview.mock.calls[0][0];
        expect(addReviewArg).not.toHaveProperty('title');
        expect(res.status).toHaveBeenCalledWith(201);
    });
});
