import request from "supertest";
import { geoService } from "./controllerTestSetup";
jest.mock("../../middleware/validation");
import app from "../../app";
import { professionService } from "../../services/ProfessionService";
import { reviewService } from "../../services/ReviewService";

jest.mock("../../services/ProfessionService", () => ({
  professionService: {
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

describe("Profession Controllers", () => {
  it("gets professions", async () => {
    (professionService.getAll as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get("/api/v1/professions");
    expect(res.status).toBe(200);
    expect(professionService.getAll).toHaveBeenCalled();
  });
});
