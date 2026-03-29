/**
 * ProfessionProfile Controller Tests
 *
 * Covers:
 *   - GET    /api/professionsProfile             (getProfessionsProfile)
 *   - GET    /api/professionsProfile/:id         (getProfessionProfileById)
 *   - POST   /api/professionsProfile             (createProfessionProfile)
 *   - PUT    /api/professionsProfile/:id         (updateProfessionProfile)
 *   - DELETE /api/professionsProfile/:id         (deleteProfessionProfile)
 *   - POST   /api/professionsProfile/:id/reviews (addReviewToProfessionProfile)
 *   - GET    /api/professionsProfile/top-rated   (getTopRatedProfessionsProfile)
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
const mockFindById = vi.fn();
const mockCreate = vi.fn();
const mockUpdateById = vi.fn();
const mockDeleteById = vi.fn();
const mockAddReview = vi.fn();
const mockGetTopRatedReviews = vi.fn();

vi.mock('@/services/ProfessionProfileService.js', () => ({
    professionProfileService: {
        getAll: mockGetAll,
        findById: mockFindById,
        create: mockCreate,
        updateById: mockUpdateById,
        deleteById: mockDeleteById,
    },
}));

vi.mock('@/services/ReviewService.js', () => ({
    reviewService: {
        addReview: mockAddReview,
        getTopRatedReviews: mockGetTopRatedReviews,
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

const MOCK_PROFILE = {
    _id: '64f8e2a1c9d4b5e6f7896aaa',
    name: 'Chef Maria Green',
    specialization: 'Raw food cuisine',
    bio: 'Award-winning plant-based chef',
    location: 'Barcelona',
    yearsOfExperience: 8,
};

const MOCK_PROFILE_LIST = [
    MOCK_PROFILE,
    { ...MOCK_PROFILE, _id: '64f8e2a1c9d4b5e6f7896bbb', name: 'Dr. Paulo Roots' },
];

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
// getProfessionsProfile
// ===========================================================================

describe('getProfessionsProfile controller', () => {
    let getProfessionsProfile: ControllerFn;

    beforeAll(async () => {
        ({ getProfessionsProfile } = await import('@/controllers/professionProfileController.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetAll.mockResolvedValue(MOCK_PROFILE_LIST);
    });

    it('returns 200 with success:true and a profiles array', async () => {
        const req = testUtils.createMockRequest({}) as Request;
        const { res, next } = createMocks();

        await getProfessionsProfile(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
    });

    it('calls ProfessionProfileService.getAll once', async () => {
        const req = testUtils.createMockRequest({}) as Request;
        const { res, next } = createMocks();

        await getProfessionsProfile(req, res, next);

        expect(mockGetAll).toHaveBeenCalledOnce();
    });

    it('returns empty array when no profiles exist', async () => {
        mockGetAll.mockResolvedValue([]);
        const req = testUtils.createMockRequest({}) as Request;
        const { res, next } = createMocks();

        await getProfessionsProfile(req, res, next);

        const body = getJsonResponse(res);
        expect(body.data).toEqual([]);
    });

    it('forwards service errors to next()', async () => {
        mockGetAll.mockRejectedValue(new Error('DB error'));
        const req = testUtils.createMockRequest({}) as Request;
        const { res, next } = createMocks();

        await getProfessionsProfile(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// getProfessionProfileById
// ===========================================================================

describe('getProfessionProfileById controller', () => {
    let getProfessionProfileById: ControllerFn;

    beforeAll(async () => {
        ({ getProfessionProfileById } = await import('@/controllers/professionProfileController.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockFindById.mockResolvedValue(MOCK_PROFILE);
    });

    it('returns 200 with profile data for a valid id', async () => {
        const req = testUtils.createMockRequest({ params: { id: MOCK_PROFILE._id } }) as Request;
        const { res, next } = createMocks();

        await getProfessionProfileById(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ _id: MOCK_PROFILE._id });
    });

    it('calls next with 400 when id param is missing', async () => {
        const req = testUtils.createMockRequest({ params: {} }) as Request;
        const { res, next } = createMocks();

        await getProfessionProfileById(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });

    it('forwards 404 error from service to next()', async () => {
        const { HttpError, HttpStatusCode } = await import('@/types/Errors.js');
        mockFindById.mockRejectedValue(new HttpError(HttpStatusCode.NOT_FOUND, 'Profile not found'));
        const req = testUtils.createMockRequest({ params: { id: 'ghost' } }) as Request;
        const { res, next } = createMocks();

        await getProfessionProfileById(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// createProfessionProfile
// ===========================================================================

describe('createProfessionProfile controller', () => {
    let createProfessionProfile: ControllerFn;

    beforeAll(async () => {
        ({ createProfessionProfile } = await import('@/controllers/professionProfileController.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockCreate.mockResolvedValue(MOCK_PROFILE);
    });

    it('returns 201 with created profile on valid input', async () => {
        const req = testUtils.createMockRequest({
            body: { name: 'Chef Maria Green', specialization: 'Raw food', bio: 'Chef bio' },
        }) as Request;
        const { res, next } = createMocks();

        await createProfessionProfile(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ name: 'Chef Maria Green' });
    });

    it('calls service create exactly once', async () => {
        const req = testUtils.createMockRequest({
            body: { name: 'Test Profile', specialization: 'general' },
        }) as Request;
        const { res, next } = createMocks();

        await createProfessionProfile(req, res, next);

        expect(mockCreate).toHaveBeenCalledOnce();
    });

    it('forwards service errors to next()', async () => {
        mockCreate.mockRejectedValue(new Error('Validation error'));
        const req = testUtils.createMockRequest({ body: { name: 'Bad' } }) as Request;
        const { res, next } = createMocks();

        await createProfessionProfile(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// updateProfessionProfile
// ===========================================================================

describe('updateProfessionProfile controller', () => {
    let updateProfessionProfile: ControllerFn;

    beforeAll(async () => {
        ({ updateProfessionProfile } = await import('@/controllers/professionProfileController.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockUpdateById.mockResolvedValue({ ...MOCK_PROFILE, yearsOfExperience: 10 });
    });

    it('returns 200 with updated profile on valid id and body', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_PROFILE._id },
            body: { yearsOfExperience: 10 },
        }) as Request;
        const { res, next } = createMocks();

        await updateProfessionProfile(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ yearsOfExperience: 10 });
    });

    it('calls next with 400 when id param is missing', async () => {
        const req = testUtils.createMockRequest({ params: {}, body: { yearsOfExperience: 10 } }) as Request;
        const { res, next } = createMocks();

        await updateProfessionProfile(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });

    it('forwards service errors to next()', async () => {
        mockUpdateById.mockRejectedValue(new Error('Update failed'));
        const req = testUtils.createMockRequest({
            params: { id: MOCK_PROFILE._id },
            body: { yearsOfExperience: 10 },
        }) as Request;
        const { res, next } = createMocks();

        await updateProfessionProfile(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// deleteProfessionProfile
// ===========================================================================

describe('deleteProfessionProfile controller', () => {
    let deleteProfessionProfile: ControllerFn;

    beforeAll(async () => {
        ({ deleteProfessionProfile } = await import('@/controllers/professionProfileController.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockDeleteById.mockResolvedValue(undefined);
    });

    it('returns 200 with success:true on valid id', async () => {
        const req = testUtils.createMockRequest({ params: { id: MOCK_PROFILE._id } }) as Request;
        const { res, next } = createMocks();

        await deleteProfessionProfile(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
    });

    it('calls next with 400 when id param is missing', async () => {
        const req = testUtils.createMockRequest({ params: {} }) as Request;
        const { res, next } = createMocks();

        await deleteProfessionProfile(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });

    it('does not call deleteById when id is missing', async () => {
        const req = testUtils.createMockRequest({ params: {} }) as Request;
        const { res, next } = createMocks();

        await deleteProfessionProfile(req, res, next);

        expect(mockDeleteById).not.toHaveBeenCalled();
    });

    it('calls next with an error when service throws', async () => {
        // deleteProfessionProfile wraps all errors in a 500 HttpError (see controller source).
        // A thrown HttpError from the service is still caught and re-wrapped.
        mockDeleteById.mockRejectedValue(new Error('Profile not found'));
        const req = testUtils.createMockRequest({ params: { id: 'ghost' } }) as Request;
        const { res, next } = createMocks();

        await deleteProfessionProfile(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// addReviewToProfessionProfile
// ===========================================================================

describe('addReviewToProfessionProfile controller', () => {
    let addReviewToProfessionProfile: ControllerFn;

    beforeAll(async () => {
        ({ addReviewToProfessionProfile } = await import('@/controllers/professionProfileController.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockAddReview.mockResolvedValue({ _id: 'rev1', rating: 5, content: 'Excellent service' });
    });

    it('returns 200 with review data on success', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_PROFILE._id },
            body: { rating: 5, content: 'Excellent service', author: 'user1' },
        }) as Request;
        const { res, next } = createMocks();

        await addReviewToProfessionProfile(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ _id: 'rev1' });
    });

    it('passes entity id and entityType to ReviewService', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_PROFILE._id },
            body: { rating: 4, content: 'Good' },
        }) as Request;
        const { res, next } = createMocks();

        await addReviewToProfessionProfile(req, res, next);

        expect(mockAddReview).toHaveBeenCalledOnce();
        const callArg = mockAddReview.mock.calls[0][0];
        // ProfessionProfile maps entityType to 'Business' for now (see controller source)
        expect(callArg.entityType).toBe('Business');
        expect(callArg.entity).toBe(MOCK_PROFILE._id);
    });

    it('forwards ReviewService errors to next()', async () => {
        mockAddReview.mockRejectedValue(new Error('Review error'));
        const req = testUtils.createMockRequest({
            params: { id: MOCK_PROFILE._id },
            body: { rating: 2, content: 'Hmm' },
        }) as Request;
        const { res, next } = createMocks();

        await addReviewToProfessionProfile(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// getTopRatedProfessionsProfile
// ===========================================================================

describe('getTopRatedProfessionsProfile controller', () => {
    let getTopRatedProfessionsProfile: ControllerFn;

    beforeAll(async () => {
        ({ getTopRatedProfessionsProfile } = await import('@/controllers/professionProfileController.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetTopRatedReviews.mockResolvedValue([{ _id: MOCK_PROFILE._id, rating: 5 }]);
    });

    it('returns 200 with top rated profiles array', async () => {
        const req = testUtils.createMockRequest({}) as Request;
        const { res, next } = createMocks();

        await getTopRatedProfessionsProfile(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
    });

    it('calls ReviewService.getTopRatedReviews with "professionProfile"', async () => {
        const req = testUtils.createMockRequest({}) as Request;
        const { res, next } = createMocks();

        await getTopRatedProfessionsProfile(req, res, next);

        expect(mockGetTopRatedReviews).toHaveBeenCalledWith('professionProfile');
    });

    it('forwards errors to next() when ReviewService throws', async () => {
        mockGetTopRatedReviews.mockRejectedValue(new Error('service error'));
        const req = testUtils.createMockRequest({}) as Request;
        const { res, next } = createMocks();

        await getTopRatedProfessionsProfile(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});
