import { describe, it, expect, beforeEach, vi } from 'vitest';
import { postService } from '../../services/PostService.js';

describe('PostService — removeComment authorization', () => {
    const createMockPost = (comments: Array<{ id: string; username: { toString: () => string }; text: string }>) => ({
        _id: 'post123',
        text: 'Test post',
        likes: [],
        comments,
        save: vi.fn().mockResolvedValue(true),
    });

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('should remove a comment when the author requests it', async () => {
        const mockPost = createMockPost([
            { id: 'comment1', username: { toString: () => 'user1' }, text: 'My comment' },
            { id: 'comment2', username: { toString: () => 'user2' }, text: 'Other comment' },
        ]);
        vi.spyOn(postService, 'findById').mockResolvedValue(mockPost as any);

        const result = await postService.removeComment('post123', 'comment1', 'user1');

        expect(mockPost.save).toHaveBeenCalled();
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('comment2');
    });

    it('should throw UNAUTHORIZED when non-author tries to delete', async () => {
        const mockPost = createMockPost([
            { id: 'comment1', username: { toString: () => 'user1' }, text: 'My comment' },
        ]);
        vi.spyOn(postService, 'findById').mockResolvedValue(mockPost as any);

        await expect(postService.removeComment('post123', 'comment1', 'user999'))
            .rejects.toThrow();
    });

    it('should throw NOT_FOUND when comment does not exist', async () => {
        const mockPost = createMockPost([]);
        vi.spyOn(postService, 'findById').mockResolvedValue(mockPost as any);

        await expect(postService.removeComment('post123', 'nonexistent', 'user1'))
            .rejects.toThrow();
    });

    it('should throw NOT_FOUND when post does not exist', async () => {
        vi.spyOn(postService, 'findById').mockRejectedValue(new Error('Item not found'));

        await expect(postService.removeComment('nonexistent', 'comment1', 'user1'))
            .rejects.toThrow();
    });
});

describe('PostService — unlikePost', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('should remove like from post when user has liked it', async () => {
        const mockPost = {
            _id: 'post123',
            likes: [
                { username: { toString: () => 'user1' } },
                { username: { toString: () => 'user2' } },
            ],
            save: vi.fn().mockResolvedValue(true),
        };
        vi.spyOn(postService, 'findById').mockResolvedValue(mockPost as any);

        const result = await postService.unlikePost('post123', 'user1');

        expect(mockPost.save).toHaveBeenCalled();
        expect(result).toHaveLength(1);
    });

    it('should throw BAD_REQUEST when user has not liked the post', async () => {
        const mockPost = {
            _id: 'post123',
            likes: [{ username: { toString: () => 'user2' } }],
            save: vi.fn(),
        };
        vi.spyOn(postService, 'findById').mockResolvedValue(mockPost as any);

        await expect(postService.unlikePost('post123', 'user999'))
            .rejects.toThrow();
    });
});
