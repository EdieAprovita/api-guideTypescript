import { faker } from '@faker-js/faker';
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
                        likes: [{ username: faker.database.mongodbObjectId() }],
                        save: jest.fn().mockResolvedValue(true)
                    };
                }
                if (id === 'post-with-comments') {
                    return {
                        _id: id,
                        comments: [{ id: 'comment1', username: faker.database.mongodbObjectId() }],
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
        const result = await postService.likePost("valid-post-id", faker.database.mongodbObjectId());
        expect(result).toEqual([{ username: faker.database.mongodbObjectId() }]);
    });

    it("throws when liking an already liked post", async () => {
        await expect(postService.likePost("liked-post-id", faker.database.mongodbObjectId())).rejects.toThrow(HttpError);
    });

    it("unlikes a liked post", async () => {
        const result = await postService.unlikePost("liked-post-id", faker.database.mongodbObjectId());
        expect(result).toEqual([]);
    });

    it("fails to remove someone else's comment", async () => {
        await expect(
            postService.removeComment("post-with-comments", "comment1", faker.database.mongodbObjectId())
        ).rejects.toThrow(HttpError);
    });
});
