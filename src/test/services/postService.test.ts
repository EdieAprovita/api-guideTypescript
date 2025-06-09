import { postService } from "../../services/PostService";
import { HttpError } from "../../types/Errors";

describe("PostService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("likes a post when not already liked", async () => {
    const save = jest.fn();
    const post = { likes: [], save } as any;
    const mockModel = { findById: jest.fn().mockResolvedValue(post) } as any;
    (postService as any).model = mockModel;

    const result = await postService.likePost("p1", "u1");

    expect(mockModel.findById).toHaveBeenCalledWith("p1");
    expect(post.likes).toEqual([{ username: "u1" }]);
    expect(save).toHaveBeenCalled();
    expect(result).toEqual(post.likes);
  });

  it("throws when liking an already liked post", async () => {
    const post = { likes: [{ username: "u1" }], save: jest.fn() } as any;
    const mockModel = { findById: jest.fn().mockResolvedValue(post) } as any;
    (postService as any).model = mockModel;

    await expect(postService.likePost("p1", "u1")).rejects.toThrow(HttpError);
  });

  it("unlikes a liked post", async () => {
    const save = jest.fn();
    const post = { likes: [{ username: "u1" }], save } as any;
    const mockModel = { findById: jest.fn().mockResolvedValue(post) } as any;
    (postService as any).model = mockModel;

    const result = await postService.unlikePost("p1", "u1");

    expect(post.likes).toEqual([]);
    expect(save).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("fails to remove someone else's comment", async () => {
    const save = jest.fn();
    const post = {
      comments: [{ id: "c1", username: "u1" }],
      save,
    } as any;
    const mockModel = { findById: jest.fn().mockResolvedValue(post) } as any;
    (postService as any).model = mockModel;

    await expect(
      postService.removeComment("p1", "c1", "u2")
    ).rejects.toThrow(HttpError);
  });
});
