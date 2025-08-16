import { vi, describe, it, beforeEach, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import { Types } from 'mongoose';
import { postService } from "../../services/PostService";
import { HttpError } from "../../types/Errors";

// Pre-generate consistent test IDs
const existingUserId = faker.database.mongodbObjectId();
const existingCommentUserId = faker.database.mongodbObjectId();

// Create a proper mock post with array methods
const createMockPost = (id: string, likes: any[] = [], comments: any[] = []) => {
    const post = {
        _id: id,
        likes: [...likes],
        comments: [...comments],
        save: vi.fn().mockResolvedValue(true)
    };
    
    // Add array methods to likes
    post.likes.some = Array.prototype.some.bind(post.likes);
    post.likes.unshift = Array.prototype.unshift.bind(post.likes);
    post.likes.filter = Array.prototype.filter.bind(post.likes);
    
    return post;
};

// Mock BaseService to avoid modelName issues
vi.mock('../../services/BaseService', () => {
    return {
        __esModule: true,
        default: class MockBaseService {
            constructor() {}
            async findById(id: string) {
                if (id === 'valid-post-id') {
                    return createMockPost(id);
                }
                if (id === 'liked-post-id') {
                    return createMockPost(id, [{ username: new Types.ObjectId(existingUserId) }]);
                }
                if (id === 'post-with-comments') {
                    return createMockPost(id, [], [{ id: 'comment1', username: new Types.ObjectId(existingCommentUserId) }]);
                }
                return null;
            }
        }
    };
});

describe("PostService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("likes a post when not already liked", async () => {
        const userId = faker.database.mongodbObjectId();
        const result = await postService.likePost("valid-post-id", userId);
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('username');
        expect(result[0].username.toString()).toBe(userId);
    });

    it("throws when liking an already liked post", async () => {
        await expect(postService.likePost("liked-post-id", existingUserId)).rejects.toThrow(HttpError);
    });

    it("unlikes a liked post", async () => {
        const result = await postService.unlikePost("liked-post-id", existingUserId);
        expect(result).toEqual([]);
    });

    it("fails to remove someone else's comment", async () => {
        const userId = faker.database.mongodbObjectId();
        await expect(
            postService.removeComment("post-with-comments", "comment1", userId)
        ).rejects.toThrow(HttpError);
    });
});
