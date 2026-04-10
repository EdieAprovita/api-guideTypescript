/**
 * Markets Controllers Tests
 *
 * Covers:
 *   - GET    /api/markets             (getMarkets)
 *   - GET    /api/markets/:id         (getMarketById)
 *   - POST   /api/markets             (createMarket)
 *   - PUT    /api/markets/:id         (updateMarket)
 *   - DELETE /api/markets/:id         (deleteMarket)
 *   - POST   /api/markets/:id/reviews (addReviewToMarket)
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
const mockFindById = vi.fn();
const mockCreate = vi.fn();
const mockUpdateById = vi.fn();
const mockDeleteById = vi.fn();
const mockFindNearbyPaginated = vi.fn();
const mockAddReview = vi.fn();
const mockFindByUserAndEntity = vi.fn();
const mockGetReviewsByEntity = vi.fn();
const mockGetReviewStats = vi.fn();

vi.mock('@/services/MarketsService.js', () => ({
    marketsService: {
        getAll: mockGetAll,
        getAllPaginated: mockGetAllPaginated,
        findById: mockFindById,
        create: mockCreate,
        updateById: mockUpdateById,
        deleteById: mockDeleteById,
        findNearbyPaginated: mockFindNearbyPaginated,
    },
}));

vi.mock('@/services/ReviewService.js', () => ({
    reviewService: {
        addReview: mockAddReview,
        findByUserAndEntity: mockFindByUserAndEntity,
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

const MOCK_MARKET = {
    _id: '64f8e2a1c9d4b5e6f7891aaa',
    name: 'Sunrise Vegan Market',
    address: '789 Plant St',
    city: 'Greenville',
    phone: '+1555000111',
};

const MOCK_MARKET_LIST = [
    MOCK_MARKET,
    { ...MOCK_MARKET, _id: '64f8e2a1c9d4b5e6f7891bbb', name: 'Earth Roots Market' },
];

const MOCK_PAGINATED = {
    data: MOCK_MARKET_LIST,
    pagination: { currentPage: 1, totalPages: 1, totalItems: 2, itemsPerPage: 10, hasNextPage: false, hasPrevPage: false },
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
// getMarkets
// ===========================================================================

describe('getMarkets controller', () => {
    let getMarkets: ControllerFn;

    beforeAll(async () => {
        ({ getMarkets } = await import('@/controllers/marketsControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetAll.mockResolvedValue(MOCK_MARKET_LIST);
        mockGetAllPaginated.mockResolvedValue(MOCK_PAGINATED);
    });

    it('returns 200 with success:true and a data array', async () => {
        const req = testUtils.createMockRequest({ query: {} }) as Request;
        const { res, next } = createMocks();

        await getMarkets(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
    });

    it('returns paginated response with meta when page/limit are provided', async () => {
        const req = testUtils.createMockRequest({ query: { page: '1', limit: '5' } }) as Request;
        const { res, next } = createMocks();

        await getMarkets(req, res, next);

        expect(mockGetAllPaginated).toHaveBeenCalledWith('1', '5');
        const body = getJsonResponse(res);
        expect(body).toHaveProperty('pagination');
    });

    it('returns empty array when no markets exist', async () => {
        mockGetAll.mockResolvedValue([]);
        const req = testUtils.createMockRequest({ query: {} }) as Request;
        const { res, next } = createMocks();

        await getMarkets(req, res, next);

        const body = getJsonResponse(res);
        expect(body.data).toEqual([]);
    });

    it('forwards service errors to next()', async () => {
        mockGetAll.mockRejectedValue(new Error('DB timeout'));
        const req = testUtils.createMockRequest({ query: {} }) as Request;
        const { res, next } = createMocks();

        await getMarkets(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// getMarketById
// ===========================================================================

describe('getMarketById controller', () => {
    let getMarketById: ControllerFn;

    beforeAll(async () => {
        ({ getMarketById } = await import('@/controllers/marketsControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockFindById.mockResolvedValue(MOCK_MARKET);
    });

    it('returns 200 with market data for a valid id', async () => {
        const req = testUtils.createMockRequest({ params: { id: MOCK_MARKET._id } }) as Request;
        const { res, next } = createMocks();

        await getMarketById(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ _id: MOCK_MARKET._id });
    });

    it('calls next with 400 when id param is missing', async () => {
        const req = testUtils.createMockRequest({ params: {} }) as Request;
        const { res, next } = createMocks();

        await getMarketById(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });

    it('forwards 404 error from service to next()', async () => {
        const { HttpError, HttpStatusCode } = await import('@/types/Errors.js');
        mockFindById.mockRejectedValue(new HttpError(HttpStatusCode.NOT_FOUND, 'Market not found'));
        const req = testUtils.createMockRequest({ params: { id: 'ghost' } }) as Request;
        const { res, next } = createMocks();

        await getMarketById(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });
});

// ===========================================================================
// createMarket
// ===========================================================================

describe('createMarket controller', () => {
    let createMarket: ControllerFn;

    beforeAll(async () => {
        ({ createMarket } = await import('@/controllers/marketsControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockCreate.mockResolvedValue(MOCK_MARKET);
    });

    it('returns 201 with created market on valid input', async () => {
        const req = testUtils.createMockRequest({
            body: { name: 'Sunrise Vegan Market', address: '789 Plant St', city: 'Greenville' },
        }) as Request;
        const { res, next } = createMocks();

        await createMarket(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ name: 'Sunrise Vegan Market' });
    });

    it('calls service create exactly once', async () => {
        const req = testUtils.createMockRequest({
            body: { name: 'Test Market', address: '1 Ave' },
        }) as Request;
        const { res, next } = createMocks();

        await createMarket(req, res, next);

        expect(mockCreate).toHaveBeenCalledOnce();
    });

    it('forwards service errors to next()', async () => {
        mockCreate.mockRejectedValue(new Error('Duplicate key'));
        const req = testUtils.createMockRequest({
            body: { name: 'Dup', address: '1 Ave' },
        }) as Request;
        const { res, next } = createMocks();

        await createMarket(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// updateMarket
// ===========================================================================

describe('updateMarket controller', () => {
    let updateMarket: ControllerFn;

    beforeAll(async () => {
        ({ updateMarket } = await import('@/controllers/marketsControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockUpdateById.mockResolvedValue({ ...MOCK_MARKET, city: 'Newville' });
    });

    it('returns 200 with updated market on valid id and body', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_MARKET._id },
            body: { city: 'Newville' },
        }) as Request;
        const { res, next } = createMocks();

        await updateMarket(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ city: 'Newville' });
    });

    it('calls next with 400 when id param is missing', async () => {
        const req = testUtils.createMockRequest({ params: {}, body: { city: 'X' } }) as Request;
        const { res, next } = createMocks();

        await updateMarket(req, res, next);

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

        await updateMarket(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(404);
    });
});

// ===========================================================================
// deleteMarket
// ===========================================================================

describe('deleteMarket controller', () => {
    let deleteMarket: ControllerFn;

    beforeAll(async () => {
        ({ deleteMarket } = await import('@/controllers/marketsControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockDeleteById.mockResolvedValue(undefined);
    });

    it('returns 200 with success:true on valid id', async () => {
        const req = testUtils.createMockRequest({ params: { id: MOCK_MARKET._id } }) as Request;
        const { res, next } = createMocks();

        await deleteMarket(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
    });

    it('calls next with 400 when id param is missing', async () => {
        const req = testUtils.createMockRequest({ params: {} }) as Request;
        const { res, next } = createMocks();

        await deleteMarket(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });

    it('calls next with error when service throws 404', async () => {
        const { HttpError, HttpStatusCode } = await import('@/types/Errors.js');
        mockDeleteById.mockRejectedValue(new HttpError(HttpStatusCode.NOT_FOUND, 'Market not found'));
        const req = testUtils.createMockRequest({ params: { id: 'ghost' } }) as Request;
        const { res, next } = createMocks();

        await deleteMarket(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });
});

// ===========================================================================
// addReviewToMarket
// ===========================================================================

describe('addReviewToMarket controller', () => {
    let addReviewToMarket: ControllerFn;

    beforeAll(async () => {
        ({ addReviewToMarket } = await import('@/controllers/marketsControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        // createAddReviewHandler requires: entity found, no prior review, then creates review
        mockFindById.mockResolvedValue(MOCK_MARKET);
        mockFindByUserAndEntity.mockResolvedValue(null); // no duplicate review
        mockAddReview.mockResolvedValue({ _id: 'rev1', rating: 4, content: 'Great market' });
    });

    it('returns 201 with review data on success', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_MARKET._id },
            body: { rating: 4, content: 'Great market' },
            user: { _id: 'user1', role: 'user' },
        }) as Request;
        const { res, next } = createMocks();

        await addReviewToMarket(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ _id: 'rev1' });
    });

    it('passes entityType Market and entity id to ReviewService', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_MARKET._id },
            body: { rating: 3, content: 'Decent' },
            user: { _id: 'user1', role: 'user' },
        }) as Request;
        const { res, next } = createMocks();

        await addReviewToMarket(req, res, next);

        expect(mockAddReview).toHaveBeenCalledOnce();
        const callArg = mockAddReview.mock.calls[0][0];
        expect(callArg.entityType).toBe('Market');
        expect(callArg.entity).toBe(MOCK_MARKET._id);
    });

    it('calls next with 401 when user is not authenticated', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_MARKET._id },
            body: { rating: 2, content: 'Meh' },
        }) as Request;
        delete (req as Record<string, unknown>).user;
        const { res, next } = createMocks();

        await addReviewToMarket(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(401);
    });

    it('forwards ReviewService errors to next()', async () => {
        mockAddReview.mockRejectedValue(new Error('Review failed'));
        const req = testUtils.createMockRequest({
            params: { id: MOCK_MARKET._id },
            body: { rating: 2, content: 'Meh' },
            user: { _id: 'user1', role: 'user' },
        }) as Request;
        const { res, next } = createMocks();

        await addReviewToMarket(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});
