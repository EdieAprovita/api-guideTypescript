import request from "supertest";
jest.mock("../../middleware/validation");
import app from "../../app";
import { postService } from "../../services/PostService";

jest.mock("../../config/db");
jest.mock("../../services/PostService", () => ({
  postService: {
    getAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    addComment: jest.fn(),
    likePost: jest.fn(),
    unlikePost: jest.fn(),
  },
}));

jest.mock("../../middleware/authMiddleware", () => ({
  protect: (req: any, _res: any, next: any) => {
    req.user = { _id: "user", role: "admin" };
    next();
  },
  admin: (_req: any, _res: any, next: any) => next(),
  professional: (_req: any, _res: any, next: any) => next(),
}));

describe("Post Controllers", () => {
  it("likes a post", async () => {
    (postService.likePost as jest.Mock).mockResolvedValue([]);

    const res = await request(app).post("/api/v1/posts/like/1");

    expect(res.status).toBe(200);
    expect(postService.likePost).toHaveBeenCalledWith("1", "user");
  });

  it("gets posts", async () => {
    (postService.getAll as jest.Mock).mockResolvedValue([]);

    const res = await request(app).get("/api/v1/posts");

    expect(res.status).toBe(200);
    expect(postService.getAll).toHaveBeenCalled();
  });
});
