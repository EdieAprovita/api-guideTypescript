/**
 * Business Controllers Tests
 *
 * Covers:
 *   - GET  /api/businesses          (getBusinesses)
 *   - GET  /api/businesses/:id      (getBusinessById)
 *   - POST /api/businesses          (createBusiness)
 *   - PUT  /api/businesses/:id      (updateBusiness)
 *   - DELETE /api/businesses/:id    (deleteBusiness)
 *   - GET  /api/businesses/top-rated  (getTopRatedBusinesses)
 *   - GET  /api/businesses/nearby     (getNearbyBusinesses)
 *
 * Pattern: vi.mock at top level, controllers imported dynamically in beforeAll.
 * Uses testUtils for req/res/next mocks. Services are mocked — no real DB calls.
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
const mockGetTopRatedReviews = vi.fn();
const mockSearchPaginated = vi.fn();
const mockGetAllCached = vi.fn();
const mockFindByIdCached = vi.fn();

vi.mock('@/services/BusinessService.js', () => ({
    businessService: {
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
        searchPaginated: mockSearchPaginated,
        invalidateCache: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('@/services/ReviewService.js', () => ({
    reviewService: {
        getTopRatedReviews: mockGetTopRatedReviews,
        addReview: vi.fn(),
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

vi.mock('@/utils/geoHelpers.js', () => ({
    resolveCoords: vi.fn().mockReturnValue([40.7128, -74.006]),
    parseFiniteNumber: (v: unknown) => (v != null ? Number(v) : undefined),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_BUSINESS = {
    _id: '64f8e2a1c9d4b5e6f7890abc',
    namePlace: 'Green Leaf Store',
    address: '123 Vegan Ave',
    typeBusiness: 'store',
    createdAt: new Date().toISOString(),
};

const MOCK_BUSINESS_LIST = [MOCK_BUSINESS, { ...MOCK_BUSINESS, _id: '64f8e2a1c9d4b5e6f7890def', namePlace: 'Roots Market' }];

const MOCK_PAGINATED = {
    data: MOCK_BUSINESS_LIST,
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
// getBusinesses
// ===========================================================================

describe('getBusinesses controller', () => {
    let getBusinesses: ControllerFn;

    beforeAll(async () => {
        ({ getBusinesses } = await import('@/controllers/businessControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetAllCached.mockResolvedValue(MOCK_BUSINESS_LIST);
        mockGetAllPaginated.mockResolvedValue(MOCK_PAGINATED);
    });

    it('returns 200 with success:true and data array when no pagination params', async () => {
        const req = testUtils.createMockRequest({ query: {} }) as Request;
        const { res, next } = createMocks();

        await getBusinesses(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
    });

    it('returns paginated response when page/limit query params are provided', async () => {
        const req = testUtils.createMockRequest({ query: { page: '1', limit: '10' } }) as Request;
        const { res, next } = createMocks();

        await getBusinesses(req, res, next);

        expect(mockGetAllPaginated).toHaveBeenCalledWith('1', '10');
        const body = getJsonResponse(res);
        expect(body).toHaveProperty('pagination');
        expect(body.pagination).toHaveProperty('totalItems');
    });

    it('returns empty data array when no businesses exist', async () => {
        mockGetAllCached.mockResolvedValue([]);
        const req = testUtils.createMockRequest({ query: {} }) as Request;
        const { res, next } = createMocks();

        await getBusinesses(req, res, next);

        const body = getJsonResponse(res);
        expect(body.data).toEqual([]);
    });

    it('calls next with an error when service throws', async () => {
        mockGetAllCached.mockRejectedValue(new Error('DB error'));
        const req = testUtils.createMockRequest({ query: {} }) as Request;
        const { res, next } = createMocks();

        await getBusinesses(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// getBusinessById
// ===========================================================================

describe('getBusinessById controller', () => {
    let getBusinessById: ControllerFn;

    beforeAll(async () => {
        ({ getBusinessById } = await import('@/controllers/businessControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockFindByIdCached.mockResolvedValue(MOCK_BUSINESS);
    });

    it('returns 200 with business data for a valid id', async () => {
        const req = testUtils.createMockRequest({ params: { id: MOCK_BUSINESS._id } }) as Request;
        const { res, next } = createMocks();

        await getBusinessById(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ _id: MOCK_BUSINESS._id });
    });

    it('calls next with 400 when id param is missing', async () => {
        const req = testUtils.createMockRequest({ params: {} }) as Request;
        const { res, next } = createMocks();

        await getBusinessById(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });

    it('calls next with error when service throws 404', async () => {
        const { HttpError, HttpStatusCode } = await import('@/types/Errors.js');
        mockFindByIdCached.mockRejectedValue(new HttpError(HttpStatusCode.NOT_FOUND, 'Business not found'));
        const req = testUtils.createMockRequest({ params: { id: 'nonexistent' } }) as Request;
        const { res, next } = createMocks();

        await getBusinessById(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(404);
    });
});

// ===========================================================================
// createBusiness
// ===========================================================================

describe('createBusiness controller', () => {
    let createBusiness: ControllerFn;

    beforeAll(async () => {
        ({ createBusiness } = await import('@/controllers/businessControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockCreate.mockResolvedValue(MOCK_BUSINESS);
    });

    it('returns 201 with created business on valid input', async () => {
        const req = testUtils.createMockRequest({
            body: { namePlace: 'Green Leaf Store', address: '123 Vegan Ave', typeBusiness: 'store' },
        }) as Request;
        const { res, next } = createMocks();

        await createBusiness(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ namePlace: 'Green Leaf Store' });
    });

    it('calls service create exactly once with sanitized data', async () => {
        const req = testUtils.createMockRequest({
            body: { namePlace: 'Test', address: '1 St', typeBusiness: 'store' },
        }) as Request;
        const { res, next } = createMocks();

        await createBusiness(req, res, next);

        expect(mockCreate).toHaveBeenCalledOnce();
    });

    it('forwards service errors to next()', async () => {
        mockCreate.mockRejectedValue(new Error('Duplicate key'));
        const req = testUtils.createMockRequest({
            body: { namePlace: 'Dup', address: '1 St', typeBusiness: 'store' },
        }) as Request;
        const { res, next } = createMocks();

        await createBusiness(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// updateBusiness
// ===========================================================================

describe('updateBusiness controller', () => {
    let updateBusiness: ControllerFn;

    beforeAll(async () => {
        ({ updateBusiness } = await import('@/controllers/businessControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockUpdateById.mockResolvedValue({ ...MOCK_BUSINESS, namePlace: 'Updated Name' });
    });

    it('returns 200 with updated business on valid id and body', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_BUSINESS._id },
            body: { namePlace: 'Updated Name' },
        }) as Request;
        const { res, next } = createMocks();

        await updateBusiness(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ namePlace: 'Updated Name' });
    });

    it('calls next with 400 when id param is missing', async () => {
        const req = testUtils.createMockRequest({ params: {}, body: { namePlace: 'X' } }) as Request;
        const { res, next } = createMocks();

        await updateBusiness(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });

    it('calls next with 404 when service returns null (not found)', async () => {
        mockUpdateById.mockResolvedValue(null);
        const req = testUtils.createMockRequest({
            params: { id: 'doesnotexist' },
            body: { namePlace: 'X' },
        }) as Request;
        const { res, next } = createMocks();

        await updateBusiness(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(404);
    });
});

// ===========================================================================
// deleteBusiness
// ===========================================================================

describe('deleteBusiness controller', () => {
    let deleteBusiness: ControllerFn;

    beforeAll(async () => {
        ({ deleteBusiness } = await import('@/controllers/businessControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockDeleteById.mockResolvedValue(undefined);
    });

    it('returns 200 with success:true on valid id', async () => {
        const req = testUtils.createMockRequest({ params: { id: MOCK_BUSINESS._id } }) as Request;
        const { res, next } = createMocks();

        await deleteBusiness(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
    });

    it('calls next with 400 when id param is missing', async () => {
        const req = testUtils.createMockRequest({ params: {} }) as Request;
        const { res, next } = createMocks();

        await deleteBusiness(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });

    it('does not call deleteById when id is missing', async () => {
        const req = testUtils.createMockRequest({ params: {} }) as Request;
        const { res, next } = createMocks();

        await deleteBusiness(req, res, next);

        expect(mockDeleteById).not.toHaveBeenCalled();
    });

    it('calls next with error when service throws', async () => {
        const { HttpError, HttpStatusCode } = await import('@/types/Errors.js');
        mockDeleteById.mockRejectedValue(new HttpError(HttpStatusCode.NOT_FOUND, 'Business not found'));
        const req = testUtils.createMockRequest({ params: { id: 'ghost' } }) as Request;
        const { res, next } = createMocks();

        await deleteBusiness(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });
});

// ===========================================================================
// getTopRatedBusinesses
// ===========================================================================

describe('getTopRatedBusinesses controller', () => {
    let getTopRatedBusinesses: ControllerFn;

    beforeAll(async () => {
        ({ getTopRatedBusinesses } = await import('@/controllers/businessControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetTopRatedReviews.mockResolvedValue([{ _id: 'b1', rating: 5 }]);
    });

    it('returns 200 with top rated data', async () => {
        const req = testUtils.createMockRequest({}) as Request;
        const { res, next } = createMocks();

        await getTopRatedBusinesses(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
    });

    it('calls ReviewService.getTopRatedReviews with "business"', async () => {
        const req = testUtils.createMockRequest({}) as Request;
        const { res, next } = createMocks();

        await getTopRatedBusinesses(req, res, next);

        expect(mockGetTopRatedReviews).toHaveBeenCalledWith('business');
    });

    it('forwards errors to next() when ReviewService throws', async () => {
        mockGetTopRatedReviews.mockRejectedValue(new Error('cache miss'));
        const req = testUtils.createMockRequest({}) as Request;
        const { res, next } = createMocks();

        await getTopRatedBusinesses(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// getNearbyBusinesses
// ===========================================================================

describe('getNearbyBusinesses controller', () => {
    let getNearbyBusinesses: ControllerFn;

    beforeAll(async () => {
        ({ getNearbyBusinesses } = await import('@/controllers/businessControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockFindNearbyPaginated.mockResolvedValue(MOCK_PAGINATED);
    });

    it('returns 200 with paginated nearby results when coords are valid', async () => {
        const req = testUtils.createMockRequest({
            query: { latitude: '40.7128', longitude: '-74.0060', radius: '1000' },
        }) as Request;
        const { res, next } = createMocks();

        await getNearbyBusinesses(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body).toHaveProperty('data');
        expect(body).toHaveProperty('pagination');
    });

    it('calls next with 400 when resolveCoords throws due to missing coords', async () => {
        // The real resolveCoords throws when both latitude/longitude and lat/lng are absent.
        // Override the module-level mock to replicate that behaviour for this test.
        const { resolveCoords } = await import('@/utils/geoHelpers.js');
        (resolveCoords as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
            throw new Error('latitude and longitude are required');
        });

        const req = testUtils.createMockRequest({ query: {} }) as Request;
        const { res, next } = createMocks();

        await getNearbyBusinesses(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });
});
