/**
 * Doctors Controllers Tests
 *
 * Covers:
 *   - GET    /api/doctors           (getDoctors)
 *   - GET    /api/doctors/:id       (getDoctorById)
 *   - POST   /api/doctors           (createDoctor)
 *   - PUT    /api/doctors/:id       (updateDoctor)
 *   - DELETE /api/doctors/:id       (deleteDoctor)
 *   - POST   /api/doctors/:id/reviews  (addReviewToDoctor)
 *   - GET    /api/doctors/top       (getTopRatedDoctors)
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
const mockGetTopRatedReviews = vi.fn();
const mockAddReview = vi.fn();

vi.mock('@/services/DoctorService.js', () => ({
    doctorService: {
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

vi.mock('@/utils/geocodeLocation.js', () => ({
    default: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_DOCTOR = {
    _id: '64f8e2a1c9d4b5e6f7890aaa',
    name: 'Dr. Vera Green',
    specialty: 'nutrition',
    address: '456 Health Blvd',
    phone: '+1234567890',
};

const MOCK_DOCTOR_LIST = [
    MOCK_DOCTOR,
    { ...MOCK_DOCTOR, _id: '64f8e2a1c9d4b5e6f7890bbb', name: 'Dr. Marcus Root' },
];

const MOCK_PAGINATED = {
    data: MOCK_DOCTOR_LIST,
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
// getDoctors
// ===========================================================================

describe('getDoctors controller', () => {
    let getDoctors: ControllerFn;

    beforeAll(async () => {
        ({ getDoctors } = await import('@/controllers/doctorsControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetAll.mockResolvedValue(MOCK_DOCTOR_LIST);
        mockGetAllPaginated.mockResolvedValue(MOCK_PAGINATED);
    });

    it('returns 200 with success:true and a data array', async () => {
        const req = testUtils.createMockRequest({ query: {} }) as Request;
        const { res, next } = createMocks();

        await getDoctors(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
    });

    it('returns paginated response with meta when page param is provided', async () => {
        const req = testUtils.createMockRequest({ query: { page: '2', limit: '5' } }) as Request;
        const { res, next } = createMocks();

        await getDoctors(req, res, next);

        expect(mockGetAllPaginated).toHaveBeenCalledWith('2', '5');
        const body = getJsonResponse(res);
        expect(body).toHaveProperty('pagination');
    });

    it('returns empty array when no doctors exist', async () => {
        mockGetAll.mockResolvedValue([]);
        const req = testUtils.createMockRequest({ query: {} }) as Request;
        const { res, next } = createMocks();

        await getDoctors(req, res, next);

        const body = getJsonResponse(res);
        expect(body.data).toEqual([]);
    });

    it('forwards service errors to next()', async () => {
        mockGetAll.mockRejectedValue(new Error('DB unavailable'));
        const req = testUtils.createMockRequest({ query: {} }) as Request;
        const { res, next } = createMocks();

        await getDoctors(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// getDoctorById
// ===========================================================================

describe('getDoctorById controller', () => {
    let getDoctorById: ControllerFn;

    beforeAll(async () => {
        ({ getDoctorById } = await import('@/controllers/doctorsControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockFindById.mockResolvedValue(MOCK_DOCTOR);
    });

    it('returns 200 with doctor data for a valid id', async () => {
        const req = testUtils.createMockRequest({ params: { id: MOCK_DOCTOR._id } }) as Request;
        const { res, next } = createMocks();

        await getDoctorById(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ _id: MOCK_DOCTOR._id });
    });

    it('calls next with 400 when id param is missing', async () => {
        const req = testUtils.createMockRequest({ params: {} }) as Request;
        const { res, next } = createMocks();

        await getDoctorById(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });

    it('forwards 404 HttpError from service to next()', async () => {
        const { HttpError, HttpStatusCode } = await import('@/types/Errors.js');
        mockFindById.mockRejectedValue(new HttpError(HttpStatusCode.NOT_FOUND, 'Doctor not found'));
        const req = testUtils.createMockRequest({ params: { id: 'ghost' } }) as Request;
        const { res, next } = createMocks();

        await getDoctorById(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// createDoctor
// ===========================================================================

describe('createDoctor controller', () => {
    let createDoctor: ControllerFn;

    beforeAll(async () => {
        ({ createDoctor } = await import('@/controllers/doctorsControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockCreate.mockResolvedValue(MOCK_DOCTOR);
    });

    it('returns 201 with created doctor on valid input', async () => {
        const req = testUtils.createMockRequest({
            body: { name: 'Dr. Vera Green', specialty: 'nutrition', address: '456 Health Blvd' },
        }) as Request;
        const { res, next } = createMocks();

        await createDoctor(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ name: 'Dr. Vera Green' });
    });

    it('calls service create exactly once', async () => {
        const req = testUtils.createMockRequest({
            body: { name: 'Dr. Test', specialty: 'general', address: '1 St' },
        }) as Request;
        const { res, next } = createMocks();

        await createDoctor(req, res, next);

        expect(mockCreate).toHaveBeenCalledOnce();
    });

    it('forwards service errors to next()', async () => {
        mockCreate.mockRejectedValue(new Error('Validation error'));
        const req = testUtils.createMockRequest({
            body: { name: 'Dr. Fail', specialty: 'x', address: 'y' },
        }) as Request;
        const { res, next } = createMocks();

        await createDoctor(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// updateDoctor
// ===========================================================================

describe('updateDoctor controller', () => {
    let updateDoctor: ControllerFn;

    beforeAll(async () => {
        ({ updateDoctor } = await import('@/controllers/doctorsControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockUpdateById.mockResolvedValue({ ...MOCK_DOCTOR, specialty: 'dietetics' });
    });

    it('returns 200 with updated doctor on valid id and body', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_DOCTOR._id },
            body: { specialty: 'dietetics' },
        }) as Request;
        const { res, next } = createMocks();

        await updateDoctor(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
    });

    it('calls next with 400 when id param is missing', async () => {
        const req = testUtils.createMockRequest({ params: {}, body: { specialty: 'x' } }) as Request;
        const { res, next } = createMocks();

        await updateDoctor(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });

    it('calls next with 404 when service returns null (not found)', async () => {
        mockUpdateById.mockResolvedValue(null);
        const req = testUtils.createMockRequest({
            params: { id: 'nonexistent' },
            body: { specialty: 'x' },
        }) as Request;
        const { res, next } = createMocks();

        await updateDoctor(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(404);
    });
});

// ===========================================================================
// deleteDoctor
// ===========================================================================

describe('deleteDoctor controller', () => {
    let deleteDoctor: ControllerFn;

    beforeAll(async () => {
        ({ deleteDoctor } = await import('@/controllers/doctorsControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockDeleteById.mockResolvedValue(undefined);
    });

    it('returns 200 with success:true on valid id', async () => {
        const req = testUtils.createMockRequest({ params: { id: MOCK_DOCTOR._id } }) as Request;
        const { res, next } = createMocks();

        await deleteDoctor(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
    });

    it('calls next with 400 when id param is missing', async () => {
        const req = testUtils.createMockRequest({ params: {} }) as Request;
        const { res, next } = createMocks();

        await deleteDoctor(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });

    it('does not call deleteById when id is missing', async () => {
        const req = testUtils.createMockRequest({ params: {} }) as Request;
        const { res, next } = createMocks();

        await deleteDoctor(req, res, next);

        expect(mockDeleteById).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// addReviewToDoctor
// ===========================================================================

describe('addReviewToDoctor controller', () => {
    let addReviewToDoctor: ControllerFn;

    beforeAll(async () => {
        ({ addReviewToDoctor } = await import('@/controllers/doctorsControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockAddReview.mockResolvedValue({ _id: 'rev1', rating: 5, content: 'Excellent' });
    });

    it('returns 200 with the new review data', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_DOCTOR._id },
            body: { rating: 5, content: 'Excellent', author: 'user1' },
        }) as Request;
        const { res, next } = createMocks();

        await addReviewToDoctor(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ _id: 'rev1' });
    });

    it('passes entityType Doctor and entity id to ReviewService', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_DOCTOR._id },
            body: { rating: 4, content: 'Good' },
        }) as Request;
        const { res, next } = createMocks();

        await addReviewToDoctor(req, res, next);

        expect(mockAddReview).toHaveBeenCalledOnce();
        const callArg = mockAddReview.mock.calls[0][0];
        expect(callArg.entityType).toBe('Doctor');
        expect(callArg.entity).toBe(MOCK_DOCTOR._id);
    });
});

// ===========================================================================
// getTopRatedDoctors
// ===========================================================================

describe('getTopRatedDoctors controller', () => {
    let getTopRatedDoctors: ControllerFn;

    beforeAll(async () => {
        ({ getTopRatedDoctors } = await import('@/controllers/doctorsControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetTopRatedReviews.mockResolvedValue([{ _id: MOCK_DOCTOR._id, rating: 5 }]);
    });

    it('returns 200 with top rated doctors array', async () => {
        const req = testUtils.createMockRequest({}) as Request;
        const { res, next } = createMocks();

        await getTopRatedDoctors(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
    });

    it('calls ReviewService.getTopRatedReviews with "doctor"', async () => {
        const req = testUtils.createMockRequest({}) as Request;
        const { res, next } = createMocks();

        await getTopRatedDoctors(req, res, next);

        expect(mockGetTopRatedReviews).toHaveBeenCalledWith('doctor');
    });

    it('forwards errors to next() when ReviewService throws', async () => {
        mockGetTopRatedReviews.mockRejectedValue(new Error('service error'));
        const req = testUtils.createMockRequest({}) as Request;
        const { res, next } = createMocks();

        await getTopRatedDoctors(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});
