/**
 * Recipes Controllers Tests
 *
 * Covers:
 *   - GET    /api/recipes             (getRecipes)
 *   - GET    /api/recipes/:id         (getRecipeById)
 *   - POST   /api/recipes             (createRecipe)
 *   - PUT    /api/recipes/:id         (updateRecipe)
 *   - DELETE /api/recipes/:id         (deleteRecipe)
 *   - POST   /api/recipes/:id/reviews (addReviewToRecipe)
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
const mockAddReview = vi.fn();
const mockFindByUserAndEntity = vi.fn();
const mockGetReviewsByEntity = vi.fn();
const mockGetReviewStats = vi.fn();

vi.mock('@/services/RecipesService.js', () => ({
    recipeService: {
        getAll: mockGetAll,
        getAllPaginated: mockGetAllPaginated,
        findById: mockFindById,
        create: mockCreate,
        updateById: mockUpdateById,
        deleteById: mockDeleteById,
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

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_RECIPE = {
    _id: '64f8e2a1c9d4b5e6f7892aaa',
    title: 'Quinoa Buddha Bowl',
    ingredients: ['quinoa', 'chickpeas', 'kale'],
    servings: 2,
    prepTime: 20,
    author: 'user1',
};

const MOCK_RECIPE_LIST = [
    MOCK_RECIPE,
    { ...MOCK_RECIPE, _id: '64f8e2a1c9d4b5e6f7892bbb', title: 'Lentil Soup' },
];

const MOCK_PAGINATED = {
    data: MOCK_RECIPE_LIST,
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
// getRecipes
// ===========================================================================

describe('getRecipes controller', () => {
    let getRecipes: ControllerFn;

    beforeAll(async () => {
        ({ getRecipes } = await import('@/controllers/recipesControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetAll.mockResolvedValue(MOCK_RECIPE_LIST);
        mockGetAllPaginated.mockResolvedValue(MOCK_PAGINATED);
    });

    it('returns 200 with success:true and an array of recipes', async () => {
        const req = testUtils.createMockRequest({ query: {} }) as Request;
        const { res, next } = createMocks();

        await getRecipes(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
    });

    it('returns paginated response with meta when page and limit are provided', async () => {
        const req = testUtils.createMockRequest({ query: { page: '1', limit: '10' } }) as Request;
        const { res, next } = createMocks();

        await getRecipes(req, res, next);

        expect(mockGetAllPaginated).toHaveBeenCalledWith('1', '10');
        const body = getJsonResponse(res);
        expect(body).toHaveProperty('meta');
        expect(body.meta).toHaveProperty('total', 2);
    });

    it('returns empty array when no recipes exist', async () => {
        mockGetAll.mockResolvedValue([]);
        const req = testUtils.createMockRequest({ query: {} }) as Request;
        const { res, next } = createMocks();

        await getRecipes(req, res, next);

        const body = getJsonResponse(res);
        expect(body.data).toEqual([]);
    });

    it('forwards service errors to next()', async () => {
        mockGetAll.mockRejectedValue(new Error('DB error'));
        const req = testUtils.createMockRequest({ query: {} }) as Request;
        const { res, next } = createMocks();

        await getRecipes(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// getRecipeById
// ===========================================================================

describe('getRecipeById controller', () => {
    let getRecipeById: ControllerFn;

    beforeAll(async () => {
        ({ getRecipeById } = await import('@/controllers/recipesControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockFindById.mockResolvedValue(MOCK_RECIPE);
    });

    it('returns 200 with recipe data for a valid id', async () => {
        const req = testUtils.createMockRequest({ params: { id: MOCK_RECIPE._id } }) as Request;
        const { res, next } = createMocks();

        await getRecipeById(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ _id: MOCK_RECIPE._id, title: 'Quinoa Buddha Bowl' });
    });

    it('calls next with 400 when id param is missing', async () => {
        const req = testUtils.createMockRequest({ params: {} }) as Request;
        const { res, next } = createMocks();

        await getRecipeById(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });

    it('forwards 404 error from service to next()', async () => {
        const { HttpError, HttpStatusCode } = await import('@/types/Errors.js');
        mockFindById.mockRejectedValue(new HttpError(HttpStatusCode.NOT_FOUND, 'Recipe not found'));
        const req = testUtils.createMockRequest({ params: { id: 'ghost' } }) as Request;
        const { res, next } = createMocks();

        await getRecipeById(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// createRecipe
// ===========================================================================

describe('createRecipe controller', () => {
    let createRecipe: ControllerFn;

    beforeAll(async () => {
        ({ createRecipe } = await import('@/controllers/recipesControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockCreate.mockResolvedValue(MOCK_RECIPE);
    });

    it('returns 201 with created recipe data on valid input', async () => {
        const req = testUtils.createMockRequest({
            body: { title: 'Quinoa Buddha Bowl', ingredients: ['quinoa'], servings: 2 },
        }) as Request;
        const { res, next } = createMocks();

        await createRecipe(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ title: 'Quinoa Buddha Bowl' });
    });

    it('calls service create exactly once', async () => {
        const req = testUtils.createMockRequest({
            body: { title: 'Chia Pudding', ingredients: ['chia'], servings: 1 },
        }) as Request;
        const { res, next } = createMocks();

        await createRecipe(req, res, next);

        expect(mockCreate).toHaveBeenCalledOnce();
    });

    it('forwards service errors to next()', async () => {
        mockCreate.mockRejectedValue(new Error('Validation error'));
        const req = testUtils.createMockRequest({ body: { title: 'Bad' } }) as Request;
        const { res, next } = createMocks();

        await createRecipe(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// updateRecipe
// ===========================================================================

describe('updateRecipe controller', () => {
    let updateRecipe: ControllerFn;

    beforeAll(async () => {
        ({ updateRecipe } = await import('@/controllers/recipesControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockUpdateById.mockResolvedValue({ ...MOCK_RECIPE, servings: 4 });
    });

    it('returns 200 with updated recipe on valid id and body', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_RECIPE._id },
            body: { servings: 4 },
        }) as Request;
        const { res, next } = createMocks();

        await updateRecipe(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ servings: 4 });
    });

    it('calls next with 400 when id param is missing', async () => {
        const req = testUtils.createMockRequest({ params: {}, body: { servings: 4 } }) as Request;
        const { res, next } = createMocks();

        await updateRecipe(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });

    it('calls next with 404 when service returns null (not found)', async () => {
        mockUpdateById.mockResolvedValue(null);
        const req = testUtils.createMockRequest({
            params: { id: 'nonexistent' },
            body: { servings: 2 },
        }) as Request;
        const { res, next } = createMocks();

        await updateRecipe(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(404);
    });
});

// ===========================================================================
// deleteRecipe
// ===========================================================================

describe('deleteRecipe controller', () => {
    let deleteRecipe: ControllerFn;

    beforeAll(async () => {
        ({ deleteRecipe } = await import('@/controllers/recipesControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockDeleteById.mockResolvedValue(undefined);
    });

    it('returns 200 with success:true on valid id', async () => {
        const req = testUtils.createMockRequest({ params: { id: MOCK_RECIPE._id } }) as Request;
        const { res, next } = createMocks();

        await deleteRecipe(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
    });

    it('calls next with 400 when id param is missing', async () => {
        const req = testUtils.createMockRequest({ params: {} }) as Request;
        const { res, next } = createMocks();

        await deleteRecipe(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });

    it('calls next with error when service throws 404', async () => {
        const { HttpError, HttpStatusCode } = await import('@/types/Errors.js');
        mockDeleteById.mockRejectedValue(new HttpError(HttpStatusCode.NOT_FOUND, 'Recipe not found'));
        const req = testUtils.createMockRequest({ params: { id: 'ghost' } }) as Request;
        const { res, next } = createMocks();

        await deleteRecipe(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });

    it('does not call deleteById when id is missing', async () => {
        const req = testUtils.createMockRequest({ params: {} }) as Request;
        const { res, next } = createMocks();

        await deleteRecipe(req, res, next);

        expect(mockDeleteById).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// addReviewToRecipe
// ===========================================================================

describe('addReviewToRecipe controller', () => {
    let addReviewToRecipe: ControllerFn;

    beforeAll(async () => {
        ({ addReviewToRecipe } = await import('@/controllers/recipesControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        // createAddReviewHandler requires: entity found, no prior review, then creates review
        mockFindById.mockResolvedValue(MOCK_RECIPE);
        mockFindByUserAndEntity.mockResolvedValue(null); // no duplicate
        mockAddReview.mockResolvedValue({ _id: 'rev1', rating: 5, content: 'Delicious!' });
    });

    it('returns 201 with review data on success', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_RECIPE._id },
            body: { rating: 5, content: 'Delicious!' },
            user: { _id: 'user1', role: 'user' },
        }) as Request;
        const { res, next } = createMocks();

        await addReviewToRecipe(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ _id: 'rev1' });
    });

    it('passes entityType Recipe and entity id to ReviewService', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_RECIPE._id },
            body: { rating: 4, content: 'Tasty' },
            user: { _id: 'user1', role: 'user' },
        }) as Request;
        const { res, next } = createMocks();

        await addReviewToRecipe(req, res, next);

        expect(mockAddReview).toHaveBeenCalledOnce();
        const callArg = mockAddReview.mock.calls[0][0];
        expect(callArg.entityType).toBe('Recipe');
        expect(callArg.entity).toBe(MOCK_RECIPE._id);
    });

    it('calls next with 401 when user is not authenticated', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_RECIPE._id },
            body: { rating: 3, content: 'Good' },
        }) as Request;
        delete (req as Record<string, unknown>).user;
        const { res, next } = createMocks();

        await addReviewToRecipe(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(401);
    });
});
