/**
 * Restaurant Controllers Tests
 *
 * Covers:
 *   - GET    /api/restaurants             (getRestaurants)
 *   - GET    /api/restaurants/:id         (getRestaurantById)
 *   - POST   /api/restaurants             (createRestaurant)
 *   - PUT    /api/restaurants/:id         (updateRestaurant)
 *   - DELETE /api/restaurants/:id         (deleteRestaurant)
 *   - GET    /api/restaurants/top-rated   (getTopRatedRestaurants)
 *   - POST   /api/restaurants/:id/reviews (addReviewToRestaurant)
 *
 * Pattern: vi.mock at top level, controllers imported dynamically in beforeAll.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { testUtils } from '@test/helpers/testBase';

type ControllerFn = (req: Request, res: Response, next: NextFunction) => Promise<void> | void;

// ---------------------------------------------------------------------------
// Service mocks
// ---------------------------------------------------------------------------

const mockGetAll = vi.fn();
const mockGetAllPaginated = vi.fn();
const mockGetAllCached = vi.fn();
const mockFindById = vi.fn();
const mockFindByIdCached = vi.fn();
const mockCreate = vi.fn();
const mockUpdateById = vi.fn();
const mockDeleteById = vi.fn();
const mockFindNearbyPaginated = vi.fn();
const mockInvalidateCache = vi.fn();
const mockGetTopRatedReviews = vi.fn();
const mockAddReview = vi.fn();
const mockGetReviewsByEntity = vi.fn();
const mockGetReviewStats = vi.fn();

vi.mock('@/services/RestaurantService.js', () => ({
    restaurantService: {
        getAll: mockGetAll,
        getAllPaginated: mockGetAllPaginated,
        getAllCached: mockGetAllCached,
        findById: mockFindById,
        findByIdCached: mockFindByIdCached,
        create: mockCreate,
        createCached: mockCreate,
        updateById: mockUpdateById,
        updateByIdCached: mockUpdateById,
        deleteById: mockDeleteById,
        findNearbyPaginated: mockFindNearbyPaginated,
        invalidateCache: mockInvalidateCache,
    },
}));

vi.mock('@/services/ReviewService.js', () => ({
    reviewService: {
        getTopRatedReviews: mockGetTopRatedReviews,
        addReview: mockAddReview,
        getReviewsByEntity: mockGetReviewsByEntity,
        getReviewStats: mockGetReviewStats,
    },
}));

vi.mock('@/utils/sanitizer.js', () => ({
    sanitizeNoSQLInput: (data: unknown) => data,
}));

vi.mock('@/utils/logger.js', () => ({
    default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/utils/geocodeLocation.js', () => ({
    default: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_RESTAURANT = {
    _id: '64f8e2a1c9d4b5e6f7893aaa',
    name: 'The Vegan Plate',
    address: '101 Garden Lane',
    city: 'Plantville',
    cuisine: 'vegan',
    phone: '+1444000222',
};

const MOCK_RESTAURANT_LIST = [
    MOCK_RESTAURANT,
    { ...MOCK_RESTAURANT, _id: '64f8e2a1c9d4b5e6f7893bbb', name: 'Roots & Bowls' },
];

const MOCK_PAGINATED = {
    data: MOCK_RESTAURANT_LIST,
    meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getJsonResponse = (res: Response) => {
    const calls = (res.json as ReturnType<typeof vi.fn>).mock.calls;
    if (!calls || calls.length === 0) throw new Error('res.json was never called');
    return calls[0][0];
};

const createMocks = () => ({
    res: testUtils.createMockResponse() as Response,
    next: testUtils.createMockNext() as NextFunction,
});

// ===========================================================================
// getRestaurants
// ===========================================================================

describe('getRestaurants controller', () => {
    let getRestaurants: ControllerFn;

    beforeAll(async () => {
        ({ getRestaurants } = await import('@/controllers/restaurantControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetAllCached.mockResolvedValue(MOCK_RESTAURANT_LIST);
        mockGetAllPaginated.mockResolvedValue(MOCK_PAGINATED);
    });

    it('returns 200 with success:true and array of restaurants', async () => {
        const req = testUtils.createMockRequest({ query: {} }) as Request;
        const { res, next } = createMocks();

        await getRestaurants(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
    });

    it('returns paginated response with meta when page/limit are provided', async () => {
        const req = testUtils.createMockRequest({ query: { page: '2', limit: '5' } }) as Request;
        const { res, next } = createMocks();

        await getRestaurants(req, res, next);

        expect(mockGetAllPaginated).toHaveBeenCalledWith('2', '5');
        const body = getJsonResponse(res);
        expect(body).toHaveProperty('meta');
    });

    it('returns empty array when no restaurants exist', async () => {
        mockGetAllCached.mockResolvedValue([]);
        const req = testUtils.createMockRequest({ query: {} }) as Request;
        const { res, next } = createMocks();

        await getRestaurants(req, res, next);

        const body = getJsonResponse(res);
        expect(body.data).toEqual([]);
    });

    it('forwards service errors to next()', async () => {
        mockGetAllCached.mockRejectedValue(new Error('Cache failure'));
        const req = testUtils.createMockRequest({ query: {} }) as Request;
        const { res, next } = createMocks();

        await getRestaurants(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// getRestaurantById
// ===========================================================================

describe('getRestaurantById controller', () => {
    let getRestaurantById: ControllerFn;

    beforeAll(async () => {
        ({ getRestaurantById } = await import('@/controllers/restaurantControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockFindByIdCached.mockResolvedValue(MOCK_RESTAURANT);
    });

    it('returns 200 with restaurant data for a valid id', async () => {
        const req = testUtils.createMockRequest({ params: { id: MOCK_RESTAURANT._id } }) as Request;
        const { res, next } = createMocks();

        await getRestaurantById(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ _id: MOCK_RESTAURANT._id });
    });

    it('calls next with 400 when id param is missing', async () => {
        const req = testUtils.createMockRequest({ params: {} }) as Request;
        const { res, next } = createMocks();

        await getRestaurantById(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });

    it('forwards 404 error from service to next()', async () => {
        const { HttpError, HttpStatusCode } = await import('@/types/Errors.js');
        mockFindByIdCached.mockRejectedValue(new HttpError(HttpStatusCode.NOT_FOUND, 'Restaurant not found'));
        const req = testUtils.createMockRequest({ params: { id: 'ghost' } }) as Request;
        const { res, next } = createMocks();

        await getRestaurantById(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// createRestaurant
// ===========================================================================

describe('createRestaurant controller', () => {
    let createRestaurant: ControllerFn;

    beforeAll(async () => {
        ({ createRestaurant } = await import('@/controllers/restaurantControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockCreate.mockResolvedValue(MOCK_RESTAURANT);
        mockInvalidateCache.mockResolvedValue(undefined);
    });

    it('returns 201 with created restaurant on valid input', async () => {
        const req = testUtils.createMockRequest({
            body: { name: 'The Vegan Plate', address: '101 Garden Lane', cuisine: 'vegan' },
        }) as Request;
        const { res, next } = createMocks();

        await createRestaurant(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ name: 'The Vegan Plate' });
    });

    it('calls service create exactly once', async () => {
        const req = testUtils.createMockRequest({
            body: { name: 'Test Restaurant', address: '1 St', cuisine: 'vegan' },
        }) as Request;
        const { res, next } = createMocks();

        await createRestaurant(req, res, next);

        expect(mockCreate).toHaveBeenCalledOnce();
    });

    it('forwards service errors to next()', async () => {
        mockCreate.mockRejectedValue(new Error('Duplicate key'));
        const req = testUtils.createMockRequest({
            body: { name: 'Dup', address: '1 St', cuisine: 'vegan' },
        }) as Request;
        const { res, next } = createMocks();

        await createRestaurant(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// updateRestaurant
// ===========================================================================

describe('updateRestaurant controller', () => {
    let updateRestaurant: ControllerFn;

    beforeAll(async () => {
        ({ updateRestaurant } = await import('@/controllers/restaurantControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockUpdateById.mockResolvedValue({ ...MOCK_RESTAURANT, city: 'NewCity' });
        mockInvalidateCache.mockResolvedValue(undefined);
    });

    it('returns 200 with updated restaurant on valid id and body', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_RESTAURANT._id },
            body: { city: 'NewCity' },
        }) as Request;
        const { res, next } = createMocks();

        await updateRestaurant(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ city: 'NewCity' });
    });

    it('calls next with 400 when id param is missing', async () => {
        const req = testUtils.createMockRequest({ params: {}, body: { city: 'X' } }) as Request;
        const { res, next } = createMocks();

        await updateRestaurant(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });

    it('calls next with 404 when service returns null (not found)', async () => {
        mockUpdateById.mockResolvedValue(null);
        const req = testUtils.createMockRequest({
            params: { id: 'nonexistent' },
            body: { city: 'X' },
        }) as Request;
        const { res, next } = createMocks();

        await updateRestaurant(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(404);
    });
});

// ===========================================================================
// deleteRestaurant
// ===========================================================================

describe('deleteRestaurant controller', () => {
    let deleteRestaurant: ControllerFn;

    beforeAll(async () => {
        ({ deleteRestaurant } = await import('@/controllers/restaurantControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockDeleteById.mockResolvedValue(undefined);
    });

    it('returns 200 with success:true on valid id', async () => {
        const req = testUtils.createMockRequest({ params: { id: MOCK_RESTAURANT._id } }) as Request;
        const { res, next } = createMocks();

        await deleteRestaurant(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
    });

    it('calls next with 400 when id param is missing', async () => {
        const req = testUtils.createMockRequest({ params: {} }) as Request;
        const { res, next } = createMocks();

        await deleteRestaurant(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });

    it('calls next with error when service throws 404', async () => {
        const { HttpError, HttpStatusCode } = await import('@/types/Errors.js');
        mockDeleteById.mockRejectedValue(new HttpError(HttpStatusCode.NOT_FOUND, 'Restaurant not found'));
        const req = testUtils.createMockRequest({ params: { id: 'ghost' } }) as Request;
        const { res, next } = createMocks();

        await deleteRestaurant(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });
});

// ===========================================================================
// getTopRatedRestaurants
// ===========================================================================

describe('getTopRatedRestaurants controller', () => {
    let getTopRatedRestaurants: ControllerFn;

    beforeAll(async () => {
        ({ getTopRatedRestaurants } = await import('@/controllers/restaurantControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetTopRatedReviews.mockResolvedValue([{ _id: MOCK_RESTAURANT._id, rating: 5 }]);
    });

    it('returns 200 with top-rated restaurants array', async () => {
        const req = testUtils.createMockRequest({}) as Request;
        const { res, next } = createMocks();

        await getTopRatedRestaurants(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
    });

    it('calls ReviewService.getTopRatedReviews with "restaurant"', async () => {
        const req = testUtils.createMockRequest({}) as Request;
        const { res, next } = createMocks();

        await getTopRatedRestaurants(req, res, next);

        expect(mockGetTopRatedReviews).toHaveBeenCalledWith('restaurant');
    });

    it('forwards errors to next() when ReviewService throws', async () => {
        mockGetTopRatedReviews.mockRejectedValue(new Error('service error'));
        const req = testUtils.createMockRequest({}) as Request;
        const { res, next } = createMocks();

        await getTopRatedRestaurants(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// addReviewToRestaurant
// ===========================================================================

describe('addReviewToRestaurant controller', () => {
    let addReviewToRestaurant: ControllerFn;

    beforeAll(async () => {
        ({ addReviewToRestaurant } = await import('@/controllers/restaurantControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockAddReview.mockResolvedValue({ _id: 'rev1', rating: 5, content: 'Amazing!' });
        mockInvalidateCache.mockResolvedValue(undefined);
    });

    it('returns 200 with review data on success', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_RESTAURANT._id },
            body: { rating: 5, content: 'Amazing!', author: 'user1' },
        }) as Request;
        const { res, next } = createMocks();

        await addReviewToRestaurant(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ _id: 'rev1' });
    });

    it('passes entityType Restaurant and entity id to ReviewService', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_RESTAURANT._id },
            body: { rating: 4, content: 'Good food' },
        }) as Request;
        const { res, next } = createMocks();

        await addReviewToRestaurant(req, res, next);

        expect(mockAddReview).toHaveBeenCalledOnce();
        const callArg = mockAddReview.mock.calls[0][0];
        expect(callArg.entityType).toBe('Restaurant');
        expect(callArg.entity).toBe(MOCK_RESTAURANT._id);
    });

    it('invalidates restaurant cache after adding review', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_RESTAURANT._id },
            body: { rating: 3, content: 'Decent' },
        }) as Request;
        const { res, next } = createMocks();

        await addReviewToRestaurant(req, res, next);

        expect(mockInvalidateCache).toHaveBeenCalledWith(MOCK_RESTAURANT._id);
    });

    it('forwards ReviewService errors to next()', async () => {
        mockAddReview.mockRejectedValue(new Error('Review failed'));
        const req = testUtils.createMockRequest({
            params: { id: MOCK_RESTAURANT._id },
            body: { rating: 2, content: 'Bad' },
        }) as Request;
        const { res, next } = createMocks();

        await addReviewToRestaurant(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});
