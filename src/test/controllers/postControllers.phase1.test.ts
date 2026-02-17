import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response } from 'express';
import { testUtils } from '@test/helpers/testBase';
import { HttpStatusCode } from '@/types/Errors';

vi.mock('express-validator', () => ({
    __esModule: true,
    default: { validationResult: vi.fn() },
    validationResult: vi.fn(),
}));

const mockRemoveComment = vi.fn();
const mockUnlikePost = vi.fn();

vi.mock('@/services/PostService.js', () => ({
    postService: {
        getAll: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
        updateById: vi.fn(),
        deleteById: vi.fn(),
        likePost: vi.fn(),
        unlikePost: mockUnlikePost,
        addComment: vi.fn(),
        removeComment: mockRemoveComment,
    },
}));

vi.mock('@/utils/sanitizer.js', () => ({
    sanitizeNoSQLInput: (data: any) => data,
}));

describe('Phase 1 — removeComment controller', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should remove a comment and return 200', async () => {
        const { removeComment } = await import('@/controllers/postControllers.js');
        const updatedComments = [{ id: 'c2', text: 'remaining' }];
        mockRemoveComment.mockResolvedValue(updatedComments);

        const req = testUtils.createMockRequest({
            params: { postId: 'post123', commentId: 'comment1' },
            user: { _id: 'user1', role: 'user', email: 'test@test.com', isActive: true },
        }) as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext();

        await removeComment(req, res, next);

        expect(mockRemoveComment).toHaveBeenCalledWith('post123', 'comment1', 'user1');
        expect(res.status).toHaveBeenCalledWith(200);
        const jsonCall = (res.json as any).mock.calls[0][0];
        expect(jsonCall.success).toBe(true);
        expect(jsonCall.data).toEqual(updatedComments);
    });

    it('should return 400 when postId is missing', async () => {
        const { removeComment } = await import('@/controllers/postControllers.js');

        const req = testUtils.createMockRequest({
            params: { commentId: 'comment1' },
            user: { _id: 'user1', role: 'user', email: 'test@test.com', isActive: true },
        }) as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext();

        await removeComment(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(mockRemoveComment).not.toHaveBeenCalled();
    });

    it('should forward HttpError from service (UNAUTHORIZED)', async () => {
        const { removeComment } = await import('@/controllers/postControllers.js');
        const { HttpError } = await import('@/types/Errors.js');

        mockRemoveComment.mockRejectedValue(
            new HttpError(HttpStatusCode.UNAUTHORIZED, 'Unauthorized')
        );

        const req = testUtils.createMockRequest({
            params: { postId: 'post123', commentId: 'comment1' },
            user: { _id: 'user999', role: 'user', email: 'test@test.com', isActive: true },
        }) as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext();

        await removeComment(req, res, next);

        expect(next).toHaveBeenCalled();
        const errorArg = (next as any).mock.calls[0][0];
        expect(errorArg.statusCode).toBe(HttpStatusCode.UNAUTHORIZED);
    });
});

describe('Phase 1 — unlikePost via DELETE /posts/:id/likes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should unlike a post and return 200', async () => {
        const { unlikePost } = await import('@/controllers/postControllers.js');
        const updatedLikes = [{ username: 'user2' }];
        mockUnlikePost.mockResolvedValue(updatedLikes);

        const req = testUtils.createMockRequest({
            params: { id: 'post123' },
            user: { _id: 'user1', role: 'user', email: 'test@test.com', isActive: true },
        }) as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext();

        await unlikePost(req, res, next);

        expect(mockUnlikePost).toHaveBeenCalledWith('post123', 'user1');
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when postId or userId is missing', async () => {
        const { unlikePost } = await import('@/controllers/postControllers.js');

        const req = testUtils.createMockRequest({
            params: {},
            user: { _id: 'user1', role: 'user', email: 'test@test.com', isActive: true },
        }) as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext();

        await unlikePost(req, res, next);

        expect(next).toHaveBeenCalled();
    });
});
