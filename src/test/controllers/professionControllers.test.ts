/**
 * Profession Controllers Tests
 *
 * Covers:
 *   - GET    /api/professions             (getProfessions)
 *   - GET    /api/professions/:id         (getProfessionById)
 *   - POST   /api/professions             (createProfession)
 *   - PUT    /api/professions/:id         (updateProfession)
 *   - DELETE /api/professions/:id         (deleteProfession)
 *   - POST   /api/professions/:id/reviews (addReviewToProfession)
 *   - GET    /api/professions/top         (getTopRatedProfessions)
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
const mockGetTopRatedReviews = vi.fn();

vi.mock('@/services/ProfessionService.js', () => ({
    professionService: {
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
        getTopRatedReviews: mockGetTopRatedReviews,
        addReview: mockAddReview,
    },
}));

vi.mock('@/utils/sanitizer.js', () => ({
    sanitizeNoSQLInput: (data: unknown) => data,
}));

vi.mock('@/utils/logger.js', () => ({
    default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_PROFESSION = {
    _id: '64f8e2a1c9d4b5e6f7895aaa',
    name: 'Vegan Chef',
    category: 'culinary',
    description: 'Specializes in plant-based cuisine',
    location: 'San Francisco',
};

const MOCK_PROFESSION_LIST = [
    MOCK_PROFESSION,
    { ...MOCK_PROFESSION, _id: '64f8e2a1c9d4b5e6f7895bbb', name: 'Plant-Based Nutritionist' },
];

const MOCK_PAGINATED = {
    data: MOCK_PROFESSION_LIST,
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
// getProfessions
// ===========================================================================

describe('getProfessions controller', () => {
    let getProfessions: ControllerFn;

    beforeAll(async () => {
        ({ getProfessions } = await import('@/controllers/professionControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetAll.mockResolvedValue(MOCK_PROFESSION_LIST);
        mockGetAllPaginated.mockResolvedValue(MOCK_PAGINATED);
    });

    it('returns 200 with success:true and a professions array', async () => {
        const req = testUtils.createMockRequest({ query: {} }) as Request;
        const { res, next } = createMocks();

        await getProfessions(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
    });

    it('returns paginated response with meta when page/limit are provided', async () => {
        const req = testUtils.createMockRequest({ query: { page: '1', limit: '10' } }) as Request;
        const { res, next } = createMocks();

        await getProfessions(req, res, next);

        expect(mockGetAllPaginated).toHaveBeenCalledWith('1', '10');
        const body = getJsonResponse(res);
        expect(body).toHaveProperty('meta');
    });

    it('returns empty array when no professions exist', async () => {
        mockGetAll.mockResolvedValue([]);
        const req = testUtils.createMockRequest({ query: {} }) as Request;
        const { res, next } = createMocks();

        await getProfessions(req, res, next);

        const body = getJsonResponse(res);
        expect(body.data).toEqual([]);
    });

    it('forwards service errors to next()', async () => {
        mockGetAll.mockRejectedValue(new Error('DB error'));
        const req = testUtils.createMockRequest({ query: {} }) as Request;
        const { res, next } = createMocks();

        await getProfessions(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// getProfessionById
// ===========================================================================

describe('getProfessionById controller', () => {
    let getProfessionById: ControllerFn;

    beforeAll(async () => {
        ({ getProfessionById } = await import('@/controllers/professionControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockFindById.mockResolvedValue(MOCK_PROFESSION);
    });

    it('returns 200 with profession data for a valid id', async () => {
        const req = testUtils.createMockRequest({ params: { id: MOCK_PROFESSION._id } }) as Request;
        const { res, next } = createMocks();

        await getProfessionById(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ _id: MOCK_PROFESSION._id });
    });

    it('calls next with 400 when id param is missing', async () => {
        const req = testUtils.createMockRequest({ params: {} }) as Request;
        const { res, next } = createMocks();

        await getProfessionById(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });

    it('forwards 404 error from service to next()', async () => {
        const { HttpError, HttpStatusCode } = await import('@/types/Errors.js');
        mockFindById.mockRejectedValue(new HttpError(HttpStatusCode.NOT_FOUND, 'Profession not found'));
        const req = testUtils.createMockRequest({ params: { id: 'ghost' } }) as Request;
        const { res, next } = createMocks();

        await getProfessionById(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// createProfession
// ===========================================================================

describe('createProfession controller', () => {
    let createProfession: ControllerFn;

    beforeAll(async () => {
        ({ createProfession } = await import('@/controllers/professionControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockCreate.mockResolvedValue(MOCK_PROFESSION);
    });

    it('returns 201 with created profession on valid input', async () => {
        const req = testUtils.createMockRequest({
            body: { name: 'Vegan Chef', category: 'culinary', description: 'Plant-based chef' },
        }) as Request;
        const { res, next } = createMocks();

        await createProfession(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ name: 'Vegan Chef' });
    });

    it('calls service create exactly once', async () => {
        const req = testUtils.createMockRequest({
            body: { name: 'Test Profession', category: 'other' },
        }) as Request;
        const { res, next } = createMocks();

        await createProfession(req, res, next);

        expect(mockCreate).toHaveBeenCalledOnce();
    });

    it('forwards service errors to next()', async () => {
        mockCreate.mockRejectedValue(new Error('Validation error'));
        const req = testUtils.createMockRequest({ body: { name: 'Bad' } }) as Request;
        const { res, next } = createMocks();

        await createProfession(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// updateProfession
// ===========================================================================

describe('updateProfession controller', () => {
    let updateProfession: ControllerFn;

    beforeAll(async () => {
        ({ updateProfession } = await import('@/controllers/professionControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockUpdateById.mockResolvedValue({ ...MOCK_PROFESSION, category: 'wellness' });
    });

    it('returns 200 with updated profession on valid id and body', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_PROFESSION._id },
            body: { category: 'wellness' },
        }) as Request;
        const { res, next } = createMocks();

        await updateProfession(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ category: 'wellness' });
    });

    it('calls next with 400 when id param is missing', async () => {
        const req = testUtils.createMockRequest({ params: {}, body: { category: 'x' } }) as Request;
        const { res, next } = createMocks();

        await updateProfession(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });

    it('calls next with 404 when service returns null (not found)', async () => {
        mockUpdateById.mockResolvedValue(null);
        const req = testUtils.createMockRequest({
            params: { id: 'nonexistent' },
            body: { category: 'x' },
        }) as Request;
        const { res, next } = createMocks();

        await updateProfession(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(404);
    });
});

// ===========================================================================
// deleteProfession
// ===========================================================================

describe('deleteProfession controller', () => {
    let deleteProfession: ControllerFn;

    beforeAll(async () => {
        ({ deleteProfession } = await import('@/controllers/professionControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockDeleteById.mockResolvedValue(undefined);
    });

    it('returns 200 with success:true on valid id', async () => {
        const req = testUtils.createMockRequest({ params: { id: MOCK_PROFESSION._id } }) as Request;
        const { res, next } = createMocks();

        await deleteProfession(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
    });

    it('calls next with 400 when id param is missing', async () => {
        const req = testUtils.createMockRequest({ params: {} }) as Request;
        const { res, next } = createMocks();

        await deleteProfession(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });

    it('calls next with error when service throws 404', async () => {
        const { HttpError, HttpStatusCode } = await import('@/types/Errors.js');
        mockDeleteById.mockRejectedValue(new HttpError(HttpStatusCode.NOT_FOUND, 'Profession not found'));
        const req = testUtils.createMockRequest({ params: { id: 'ghost' } }) as Request;
        const { res, next } = createMocks();

        await deleteProfession(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });

    it('does not call deleteById when id is missing', async () => {
        const req = testUtils.createMockRequest({ params: {} }) as Request;
        const { res, next } = createMocks();

        await deleteProfession(req, res, next);

        expect(mockDeleteById).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// addReviewToProfession
// ===========================================================================

describe('addReviewToProfession controller', () => {
    let addReviewToProfession: ControllerFn;

    beforeAll(async () => {
        ({ addReviewToProfession } = await import('@/controllers/professionControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockAddReview.mockResolvedValue({ _id: 'rev1', rating: 5, content: 'Outstanding' });
    });

    it('returns 200 with review data on success', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_PROFESSION._id },
            body: { rating: 5, content: 'Outstanding', author: 'user1' },
        }) as Request;
        const { res, next } = createMocks();

        await addReviewToProfession(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ _id: 'rev1' });
    });

    it('forwards ReviewService errors to next()', async () => {
        mockAddReview.mockRejectedValue(new Error('Review error'));
        const req = testUtils.createMockRequest({
            params: { id: MOCK_PROFESSION._id },
            body: { rating: 2, content: 'Hmm' },
        }) as Request;
        const { res, next } = createMocks();

        await addReviewToProfession(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// getTopRatedProfessions
// ===========================================================================

describe('getTopRatedProfessions controller', () => {
    let getTopRatedProfessions: ControllerFn;

    beforeAll(async () => {
        ({ getTopRatedProfessions } = await import('@/controllers/professionControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetTopRatedReviews.mockResolvedValue([{ _id: MOCK_PROFESSION._id, rating: 5 }]);
    });

    it('returns 200 with top rated professions array', async () => {
        const req = testUtils.createMockRequest({}) as Request;
        const { res, next } = createMocks();

        await getTopRatedProfessions(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
    });

    it('calls ReviewService.getTopRatedReviews with "profession"', async () => {
        const req = testUtils.createMockRequest({}) as Request;
        const { res, next } = createMocks();

        await getTopRatedProfessions(req, res, next);

        expect(mockGetTopRatedReviews).toHaveBeenCalledWith('profession');
    });

    it('forwards errors to next() when ReviewService throws', async () => {
        mockGetTopRatedReviews.mockRejectedValue(new Error('service error'));
        const req = testUtils.createMockRequest({}) as Request;
        const { res, next } = createMocks();

        await getTopRatedProfessions(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});
