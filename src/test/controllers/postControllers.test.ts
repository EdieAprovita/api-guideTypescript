/**
 * Post Controllers Tests
 *
 * Covers:
 *   - GET    /api/posts              (getPosts)
 *   - GET    /api/posts/:id          (getPostById)
 *   - POST   /api/posts              (createPost)
 *   - PUT    /api/posts/:id          (updatePost)
 *   - DELETE /api/posts/:id          (deletePost)
 *   - POST   /api/posts/comment/:id  (addComment)
 *   - PUT    /api/posts/like/:id     (likePost)
 *   - PUT    /api/posts/unlike/:id   (unlikePost)
 *   - DELETE /api/posts/:postId/comments/:commentId (removeComment)
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
const mockAddComment = vi.fn();
const mockLikePost = vi.fn();
const mockUnlikePost = vi.fn();
const mockRemoveComment = vi.fn();

vi.mock('@/services/PostService.js', () => ({
    postService: {
        getAll: mockGetAll,
        findById: mockFindById,
        create: mockCreate,
        updateById: mockUpdateById,
        deleteById: mockDeleteById,
        addComment: mockAddComment,
        likePost: mockLikePost,
        unlikePost: mockUnlikePost,
        removeComment: mockRemoveComment,
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

const MOCK_POST = {
    _id: '64f8e2a1c9d4b5e6f7894aaa',
    title: 'Why I Went Vegan',
    content: 'A personal journey...',
    author: 'user1',
    likes: [],
    comments: [],
};

const MOCK_POST_LIST = [
    MOCK_POST,
    { ...MOCK_POST, _id: '64f8e2a1c9d4b5e6f7894bbb', title: 'Best Vegan Recipes' },
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
// getPosts
// ===========================================================================

describe('getPosts controller', () => {
    let getPosts: ControllerFn;

    beforeAll(async () => {
        ({ getPosts } = await import('@/controllers/postControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetAll.mockResolvedValue(MOCK_POST_LIST);
    });

    it('returns 200 with success:true and a posts array', async () => {
        const req = testUtils.createMockRequest({}) as Request;
        const { res, next } = createMocks();

        await getPosts(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
    });

    it('calls PostService.getAll once', async () => {
        const req = testUtils.createMockRequest({}) as Request;
        const { res, next } = createMocks();

        await getPosts(req, res, next);

        expect(mockGetAll).toHaveBeenCalledOnce();
    });

    it('returns empty array when no posts exist', async () => {
        mockGetAll.mockResolvedValue([]);
        const req = testUtils.createMockRequest({}) as Request;
        const { res, next } = createMocks();

        await getPosts(req, res, next);

        const body = getJsonResponse(res);
        expect(body.data).toEqual([]);
    });

    it('forwards service errors to next()', async () => {
        mockGetAll.mockRejectedValue(new Error('DB error'));
        const req = testUtils.createMockRequest({}) as Request;
        const { res, next } = createMocks();

        await getPosts(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// getPostById
// ===========================================================================

describe('getPostById controller', () => {
    let getPostById: ControllerFn;

    beforeAll(async () => {
        ({ getPostById } = await import('@/controllers/postControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockFindById.mockResolvedValue(MOCK_POST);
    });

    it('returns 200 with post data for a valid id', async () => {
        const req = testUtils.createMockRequest({ params: { id: MOCK_POST._id } }) as Request;
        const { res, next } = createMocks();

        await getPostById(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ _id: MOCK_POST._id });
    });

    it('calls next with 400 when id param is missing', async () => {
        const req = testUtils.createMockRequest({ params: {} }) as Request;
        const { res, next } = createMocks();

        await getPostById(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });

    it('forwards 404 error from service to next()', async () => {
        const { HttpError, HttpStatusCode } = await import('@/types/Errors.js');
        mockFindById.mockRejectedValue(new HttpError(HttpStatusCode.NOT_FOUND, 'Post not found'));
        const req = testUtils.createMockRequest({ params: { id: 'ghost' } }) as Request;
        const { res, next } = createMocks();

        await getPostById(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// createPost
// ===========================================================================

describe('createPost controller', () => {
    let createPost: ControllerFn;

    beforeAll(async () => {
        ({ createPost } = await import('@/controllers/postControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockCreate.mockResolvedValue(MOCK_POST);
    });

    it('returns 201 with created post data on valid input', async () => {
        const req = testUtils.createMockRequest({
            body: { title: 'Why I Went Vegan', content: 'A personal journey...' },
        }) as Request;
        const { res, next } = createMocks();

        await createPost(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ title: 'Why I Went Vegan' });
    });

    it('calls PostService.create exactly once', async () => {
        const req = testUtils.createMockRequest({
            body: { title: 'Test Post', content: 'Content' },
        }) as Request;
        const { res, next } = createMocks();

        await createPost(req, res, next);

        expect(mockCreate).toHaveBeenCalledOnce();
    });

    it('forwards service errors to next()', async () => {
        mockCreate.mockRejectedValue(new Error('Validation error'));
        const req = testUtils.createMockRequest({ body: { title: 'Bad' } }) as Request;
        const { res, next } = createMocks();

        await createPost(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.json).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// updatePost
// ===========================================================================

describe('updatePost controller', () => {
    let updatePost: ControllerFn;

    beforeAll(async () => {
        ({ updatePost } = await import('@/controllers/postControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockUpdateById.mockResolvedValue({ ...MOCK_POST, title: 'Updated Title' });
    });

    it('returns 200 with updated post on valid id and body', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_POST._id },
            body: { title: 'Updated Title' },
        }) as Request;
        const { res, next } = createMocks();

        await updatePost(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
        expect(body.data).toMatchObject({ title: 'Updated Title' });
    });

    it('calls next with 400 when id param is missing', async () => {
        const req = testUtils.createMockRequest({ params: {}, body: { title: 'X' } }) as Request;
        const { res, next } = createMocks();

        await updatePost(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });
});

// ===========================================================================
// deletePost
// ===========================================================================

describe('deletePost controller', () => {
    let deletePost: ControllerFn;

    beforeAll(async () => {
        ({ deletePost } = await import('@/controllers/postControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockDeleteById.mockResolvedValue(undefined);
    });

    it('returns 200 with success:true on valid id', async () => {
        const req = testUtils.createMockRequest({ params: { id: MOCK_POST._id } }) as Request;
        const { res, next } = createMocks();

        await deletePost(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
    });

    it('calls next with 400 when id param is missing', async () => {
        const req = testUtils.createMockRequest({ params: {} }) as Request;
        const { res, next } = createMocks();

        await deletePost(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });

    it('does not call deleteById when id is missing', async () => {
        const req = testUtils.createMockRequest({ params: {} }) as Request;
        const { res, next } = createMocks();

        await deletePost(req, res, next);

        expect(mockDeleteById).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// addComment
// ===========================================================================

describe('addComment controller', () => {
    let addComment: ControllerFn;

    beforeAll(async () => {
        ({ addComment } = await import('@/controllers/postControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockAddComment.mockResolvedValue([{ _id: 'c1', text: 'Great post!', username: 'user1' }]);
    });

    it('returns 201 with comment list on success', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_POST._id },
            body: { text: 'Great post!' },
            user: { _id: 'user1', role: 'user' },
        }) as Request;
        const { res, next } = createMocks();

        await addComment(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
    });

    it('passes postId, userId, and text to PostService.addComment', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_POST._id },
            body: { text: 'Nice!' },
            user: { _id: 'userAbc', role: 'user' },
        }) as Request;
        const { res, next } = createMocks();

        await addComment(req, res, next);

        expect(mockAddComment).toHaveBeenCalledOnce();
        const [postId, userId, text] = mockAddComment.mock.calls[0];
        expect(postId).toBe(MOCK_POST._id);
        expect(userId).toBe('userAbc');
        expect(text).toBe('Nice!');
    });

    it('calls next with 400 when post id is missing', async () => {
        const req = testUtils.createMockRequest({
            params: {},
            body: { text: 'Test' },
            user: { _id: 'user1', role: 'user' },
        }) as Request;
        const { res, next } = createMocks();

        await addComment(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });

    it('calls next with 400 when user is not authenticated', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_POST._id },
            body: { text: 'Test' },
        }) as Request;
        // Ensure user is absent
        delete (req as Record<string, unknown>).user;
        const { res, next } = createMocks();

        await addComment(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });
});

// ===========================================================================
// likePost
// ===========================================================================

describe('likePost controller', () => {
    let likePost: ControllerFn;

    beforeAll(async () => {
        ({ likePost } = await import('@/controllers/postControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockLikePost.mockResolvedValue(['user1']);
    });

    it('returns 200 with likes array on success', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_POST._id },
            user: { _id: 'user1', role: 'user' },
        }) as Request;
        const { res, next } = createMocks();

        await likePost(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
    });

    it('passes postId and userId to PostService.likePost', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_POST._id },
            user: { _id: 'userXyz', role: 'user' },
        }) as Request;
        const { res, next } = createMocks();

        await likePost(req, res, next);

        expect(mockLikePost).toHaveBeenCalledWith(MOCK_POST._id, 'userXyz');
    });

    it('calls next with 400 when post id or user is missing', async () => {
        const req = testUtils.createMockRequest({ params: {} }) as Request;
        delete (req as Record<string, unknown>).user;
        const { res, next } = createMocks();

        await likePost(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });
});

// ===========================================================================
// unlikePost
// ===========================================================================

describe('unlikePost controller', () => {
    let unlikePost: ControllerFn;

    beforeAll(async () => {
        ({ unlikePost } = await import('@/controllers/postControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockUnlikePost.mockResolvedValue([]);
    });

    it('returns 200 with updated likes array after unlike', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_POST._id },
            user: { _id: 'user1', role: 'user' },
        }) as Request;
        const { res, next } = createMocks();

        await unlikePost(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
    });

    it('passes postId and userId to PostService.unlikePost', async () => {
        const req = testUtils.createMockRequest({
            params: { id: MOCK_POST._id },
            user: { _id: 'user1', role: 'user', email: 'u@t.com', isActive: true },
        }) as Request;
        const { res, next } = createMocks();

        await unlikePost(req, res, next);

        expect(mockUnlikePost).toHaveBeenCalledWith(MOCK_POST._id, 'user1');
    });
});

// ===========================================================================
// removeComment
// ===========================================================================

describe('removeComment controller', () => {
    let removeComment: ControllerFn;

    beforeAll(async () => {
        ({ removeComment } = await import('@/controllers/postControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockRemoveComment.mockResolvedValue([]);
    });

    it('returns 200 with updated comments array on success', async () => {
        const req = testUtils.createMockRequest({
            params: { postId: MOCK_POST._id, commentId: 'c1' },
            user: { _id: 'user1', role: 'user' },
        }) as Request;
        const { res, next } = createMocks();

        await removeComment(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = getJsonResponse(res);
        expect(body.success).toBe(true);
    });

    it('passes postId, commentId, and userId to PostService.removeComment', async () => {
        const req = testUtils.createMockRequest({
            params: { postId: MOCK_POST._id, commentId: 'c1' },
            user: { _id: 'userDel', role: 'user' },
        }) as Request;
        const { res, next } = createMocks();

        await removeComment(req, res, next);

        expect(mockRemoveComment).toHaveBeenCalledWith(MOCK_POST._id, 'c1', 'userDel');
    });

    it('calls next with 400 when postId, commentId, or user is missing', async () => {
        const req = testUtils.createMockRequest({ params: { postId: MOCK_POST._id } }) as Request;
        delete (req as Record<string, unknown>).user;
        const { res, next } = createMocks();

        await removeComment(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(err.statusCode ?? err.status).toBe(400);
    });
});
