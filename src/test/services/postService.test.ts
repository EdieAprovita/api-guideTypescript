import { Types } from 'mongoose';
import { postService } from "../../services/PostService";
import { HttpError } from "../../types/Errors";

// Mock BaseService to avoid modelName issues
jest.mock('../../services/BaseService', () => {
    return {
        __esModule: true,
        default: class MockBaseService {
            constructor() {}
            async findById(id) {
                if (id === 'valid-post-id') {
                    return {
                        _id: id,
                        likes: [],
                        save: jest.fn().mockResolvedValue(true)
                    };
                }
                if (id === 'liked-post-id') {
                    return {
                        _id: id,
                        likes: [{ username: 'user1' }],
                        save: jest.fn().mockResolvedValue(true)
                    };
                }
                if (id === 'post-with-comments') {
                    return {
                        _id: id,
                        comments: [{ id: 'comment1', username: 'user1' }],
                        save: jest.fn().mockResolvedValue(true)
                    };
                }
                return null;
            }
        }
    };
});

describe("PostService", () => {
    const validPostId = new Types.ObjectId().toString();
    const validUserId = new Types.ObjectId().toString();
    const validCommentId = new Types.ObjectId().toString();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("likes a post when not already liked", async () => {
        const result = await postService.likePost("valid-post-id", "user1");
        expect(result).toEqual([{ username: "user1" }]);
    });

    it("throws when liking an already liked post", async () => {
        await expect(postService.likePost("liked-post-id", "user1")).rejects.toThrow(HttpError);
    });

    it("unlikes a liked post", async () => {
        const result = await postService.unlikePost("liked-post-id", "user1");
        expect(result).toEqual([]);
    });

    it("fails to remove someone else's comment", async () => {
        await expect(
            postService.removeComment("post-with-comments", "comment1", "user2")
        ).rejects.toThrow(HttpError);
    });
});
