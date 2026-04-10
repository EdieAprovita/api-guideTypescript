import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockRequest, mockResponse } from '../setup/unit-setup.js';

// ---------------------------------------------------------------------------
// Mock ReviewService — must appear before importing the controller so Vitest
// hoists the mock before module resolution.
// ---------------------------------------------------------------------------
vi.mock('../../services/ReviewService.js', () => ({
    reviewService: {
        listReviewsForModel: vi.fn(),
        addReview: vi.fn(),
        findAllReviews: vi.fn(),
        getReviewById: vi.fn(),
        updateReview: vi.fn(),
        deleteReview: vi.fn(),
        findByUserAndEntity: vi.fn(),
        getReviewsByEntity: vi.fn(),
        getReviewStats: vi.fn(),
        markAsHelpful: vi.fn(),
        removeHelpfulVote: vi.fn(),
    },
}));

vi.mock('../../services/RestaurantService.js', () => ({
    restaurantService: {
        findById: vi.fn(),
    },
}));

// sanitizeNoSQLInput has no side-effects we need to suppress — let it run real.
// logger is already mocked in unit-setup via vi.mock('../../utils/logger').

import {
    createReviewForRestaurant,
    getReviewById,
    updateReview,
    deleteReview,
    getAllReviews,
} from '../../controllers/reviewControllers.js';
import { reviewService } from '../../services/ReviewService.js';
import { restaurantService } from '../../services/RestaurantService.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeNext = () => vi.fn();

const makeReq = (overrides: Record<string, unknown> = {}) =>
    mockRequest(overrides as Parameters<typeof mockRequest>[0]);

const makeRes = () => mockResponse();

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('reviewControllers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ========================================================================
    // createReviewForRestaurant
    // ========================================================================
    describe('createReviewForRestaurant', () => {
        it('forces author from req.user._id, ignoring author injected in body', async () => {
            const userId = 'user-abc';
            const spoofedId = 'attacker-xyz';

            const req = makeReq({
                user: { _id: userId, role: 'user' },
                params: { restaurantId: 'rest-1' },
                body: { rating: 5, content: 'Excellent place', author: spoofedId },
            });
            const res = makeRes();
            const next = makeNext();

            vi.mocked(restaurantService.findById).mockResolvedValue({ _id: 'rest-1', name: 'Test' } as never);
            vi.mocked(reviewService.findByUserAndEntity).mockResolvedValue(null);
            vi.mocked(reviewService.addReview).mockResolvedValue({
                _id: 'rev-1',
                author: userId,
                rating: 5,
                content: 'Excellent place',
            } as never);

            await createReviewForRestaurant(req as never, res as never, next);

            // The service must be called with the authenticated user id, never the spoofed one.
            expect(reviewService.addReview).toHaveBeenCalledWith(
                expect.objectContaining({ author: userId }),
            );
            expect(reviewService.addReview).not.toHaveBeenCalledWith(
                expect.objectContaining({ author: spoofedId }),
            );
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: true }),
            );
        });

        it('returns 409 when user has already reviewed the same restaurant', async () => {
            const req = makeReq({
                user: { _id: 'user-1', role: 'user' },
                params: { restaurantId: 'rest-1' },
                body: { rating: 4, content: 'Duplicate review' },
            });
            const res = makeRes();
            const next = makeNext();

            vi.mocked(restaurantService.findById).mockResolvedValue({ _id: 'rest-1' } as never);
            vi.mocked(reviewService.findByUserAndEntity).mockResolvedValue({ _id: 'existing-rev' } as never);

            await createReviewForRestaurant(req as never, res as never, next);

            // addReview must NOT be called when a duplicate is detected.
            expect(reviewService.addReview).not.toHaveBeenCalled();

            // asyncHandler forwards the thrown HttpError (CONFLICT 409) to next.
            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({ statusCode: 409 }),
            );
        });

        it('calls next with UNAUTHORIZED (401) when req.user is absent', async () => {
            const req = makeReq({
                user: undefined,
                params: { restaurantId: 'rest-1' },
                body: { rating: 3, content: 'No auth' },
            });
            const res = makeRes();
            const next = makeNext();

            await createReviewForRestaurant(req as never, res as never, next);

            expect(reviewService.addReview).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({ statusCode: 401 }),
            );
        });

        it('calls next with NOT_FOUND (404) when restaurant does not exist', async () => {
            const req = makeReq({
                user: { _id: 'user-1', role: 'user' },
                params: { restaurantId: 'nonexistent' },
                body: { rating: 5, content: 'Great' },
            });
            const res = makeRes();
            const next = makeNext();

            vi.mocked(restaurantService.findById).mockResolvedValue(null);

            await createReviewForRestaurant(req as never, res as never, next);

            expect(reviewService.addReview).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({ statusCode: 404 }),
            );
        });

        it('calls next with BAD_REQUEST (400) when restaurantId param is missing', async () => {
            const req = makeReq({
                user: { _id: 'user-1', role: 'user' },
                params: {},
                body: { rating: 5, content: 'No param' },
            });
            const res = makeRes();
            const next = makeNext();

            await createReviewForRestaurant(req as never, res as never, next);

            expect(reviewService.addReview).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({ statusCode: 400 }),
            );
        });
    });

    // ========================================================================
    // getReviewById
    // ========================================================================
    describe('getReviewById', () => {
        it('returns the review with 200 on success', async () => {
            const mockReview = { _id: 'rev-42', rating: 4, content: 'Nice spot' };

            const req = makeReq({ params: { id: 'rev-42' } });
            const res = makeRes();
            const next = makeNext();

            vi.mocked(reviewService.getReviewById).mockResolvedValue(mockReview as never);

            await getReviewById(req as never, res as never, next);

            expect(reviewService.getReviewById).toHaveBeenCalledWith('rev-42');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: true, data: mockReview }),
            );
        });

        it('calls next with BAD_REQUEST (400) when id param is missing', async () => {
            const req = makeReq({ params: {} });
            const res = makeRes();
            const next = makeNext();

            await getReviewById(req as never, res as never, next);

            expect(reviewService.getReviewById).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({ statusCode: 400 }),
            );
        });
    });

    // ========================================================================
    // updateReview
    // ========================================================================
    describe('updateReview', () => {
        it('allows the owner to update their own review', async () => {
            const ownerId = 'owner-1';
            const mockReview = { _id: 'rev-10', author: ownerId, rating: 3 };
            const updatedReview = { ...mockReview, rating: 5 };

            const req = makeReq({
                user: { _id: ownerId, role: 'user' },
                params: { id: 'rev-10' },
                body: { rating: 5 },
            });
            const res = makeRes();
            const next = makeNext();

            // validateReviewOwnership calls getReviewById internally.
            vi.mocked(reviewService.getReviewById).mockResolvedValue(mockReview as never);
            vi.mocked(reviewService.updateReview).mockResolvedValue(updatedReview as never);

            await updateReview(req as never, res as never, next);

            expect(reviewService.updateReview).toHaveBeenCalledWith('rev-10', { rating: 5 }, ownerId);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: true, data: updatedReview }),
            );
        });

        it('calls next with FORBIDDEN (403) when a non-owner attempts to update', async () => {
            const ownerId = 'real-owner';
            const intruderId = 'intruder-2';
            const mockReview = { _id: 'rev-10', author: ownerId, rating: 3 };

            const req = makeReq({
                user: { _id: intruderId, role: 'user' },
                params: { id: 'rev-10' },
                body: { rating: 1 },
            });
            const res = makeRes();
            const next = makeNext();

            vi.mocked(reviewService.getReviewById).mockResolvedValue(mockReview as never);

            await updateReview(req as never, res as never, next);

            expect(reviewService.updateReview).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({ statusCode: 403 }),
            );
        });

        it('calls next with UNAUTHORIZED (401) when req.user is absent', async () => {
            const req = makeReq({
                user: undefined,
                params: { id: 'rev-10' },
                body: { rating: 4 },
            });
            const res = makeRes();
            const next = makeNext();

            await updateReview(req as never, res as never, next);

            expect(reviewService.updateReview).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({ statusCode: 401 }),
            );
        });
    });

    // ========================================================================
    // deleteReview
    // ========================================================================
    describe('deleteReview', () => {
        it('allows the owner to delete their own review', async () => {
            const ownerId = 'owner-del';
            const mockReview = { _id: 'rev-20', author: ownerId };

            const req = makeReq({
                user: { _id: ownerId, role: 'user' },
                params: { id: 'rev-20' },
                body: {},
            });
            const res = makeRes();
            const next = makeNext();

            vi.mocked(reviewService.getReviewById).mockResolvedValue(mockReview as never);
            vi.mocked(reviewService.deleteReview).mockResolvedValue(undefined as never);

            await deleteReview(req as never, res as never, next);

            expect(reviewService.deleteReview).toHaveBeenCalledWith('rev-20', ownerId);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: true }),
            );
        });

        it('calls next with FORBIDDEN (403) when a non-owner attempts to delete', async () => {
            const ownerId = 'real-owner';
            const intruderId = 'intruder-3';
            const mockReview = { _id: 'rev-20', author: ownerId };

            const req = makeReq({
                user: { _id: intruderId, role: 'user' },
                params: { id: 'rev-20' },
                body: {},
            });
            const res = makeRes();
            const next = makeNext();

            vi.mocked(reviewService.getReviewById).mockResolvedValue(mockReview as never);

            await deleteReview(req as never, res as never, next);

            expect(reviewService.deleteReview).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({ statusCode: 403 }),
            );
        });

        it('calls next with UNAUTHORIZED (401) when req.user is absent', async () => {
            const req = makeReq({
                user: undefined,
                params: { id: 'rev-20' },
                body: {},
            });
            const res = makeRes();
            const next = makeNext();

            await deleteReview(req as never, res as never, next);

            expect(reviewService.deleteReview).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({ statusCode: 401 }),
            );
        });
    });

    // ========================================================================
    // getAllReviews (admin)
    // ========================================================================
    describe('getAllReviews', () => {
        it('returns paginated reviews with 200 on success', async () => {
            const mockResult = {
                data: [{ _id: 'rev-100', rating: 5 }],
                pagination: { page: 1, limit: 10, total: 1 },
            };

            const req = makeReq({ query: {} });
            const res = makeRes();
            const next = makeNext();

            vi.mocked(reviewService.findAllReviews).mockResolvedValue(mockResult as never);

            await getAllReviews(req as never, res as never, next);

            expect(reviewService.findAllReviews).toHaveBeenCalledWith({});
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: mockResult.data,
                    pagination: mockResult.pagination,
                }),
            );
        });

        it('forwards query filters to the service', async () => {
            const mockResult = { data: [], pagination: { page: 2, limit: 5, total: 0 } };

            const req = makeReq({
                query: { page: '2', limit: '5', resourceType: 'Restaurant', sortBy: 'newest' },
            });
            const res = makeRes();
            const next = makeNext();

            vi.mocked(reviewService.findAllReviews).mockResolvedValue(mockResult as never);

            await getAllReviews(req as never, res as never, next);

            expect(reviewService.findAllReviews).toHaveBeenCalledWith(
                expect.objectContaining({
                    page: '2',
                    limit: '5',
                    resourceType: 'Restaurant',
                    sortBy: 'newest',
                }),
            );
        });
    });
});
