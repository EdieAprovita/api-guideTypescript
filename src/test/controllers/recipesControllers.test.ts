import request from "supertest";
import { geoService } from "./controllerTestSetup";
jest.mock("../../middleware/validation");
import app from "../../app";
import { recipeService } from "../../services/RecipesService";
import { reviewService } from "../../services/ReviewService";

jest.mock("../../services/RecipesService", () => ({
  recipeService: {
    getAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
  },
}));

jest.mock("../../services/ReviewService", () => ({
  reviewService: {
    addReview: jest.fn(),
    getTopRatedReviews: jest.fn(),
  },
}));

describe("Recipes Controllers", () => {
  it("lists recipes", async () => {
    (recipeService.getAll as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get("/api/v1/recipes");
    expect(res.status).toBe(200);
    expect(recipeService.getAll).toHaveBeenCalled();
  });
});
