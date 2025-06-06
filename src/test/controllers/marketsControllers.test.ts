import request from "supertest";
jest.mock("../../config/db");
import app from "../../app";
import { marketsService } from "../../services/MarketsService";
import { reviewService } from "../../services/ReviewService";
import geoService from "../../services/GeoService";

jest.mock("../../services/GeoService", () => ({
  __esModule: true,
  default: { geocodeAddress: jest.fn() },
}));

jest.mock("../../services/MarketsService", () => ({
  marketsService: {
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

jest.mock("../../middleware/authMiddleware", () => ({
  protect: (req, _res, next) => {
    req.user = { id: "user", role: "admin" };
    next();
  },
  admin: (_req, _res, next) => next(),
  professional: (_req, _res, next) => next(),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Markets Controllers", () => {
  it("gets all markets", async () => {
    (marketsService.getAll as jest.Mock).mockResolvedValue([]);

    const res = await request(app).get("/api/v1/markets");

    expect(res.status).toBe(200);
    expect(marketsService.getAll).toHaveBeenCalled();
  });

  it("creates a market with geocode", async () => {
    (geoService.geocodeAddress as jest.Mock).mockResolvedValue({ lat: 1, lng: 2 });
    (marketsService.create as jest.Mock).mockResolvedValue({ id: "1" });

    await request(app)
      .post("/api/v1/markets/create")
      .send({ address: "a" });

    expect(geoService.geocodeAddress).toHaveBeenCalledWith("a");
    expect(marketsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        address: "a",
        location: { type: "Point", coordinates: [2, 1] },
      })
    );
  });

  it("adds a review", async () => {
    (reviewService.addReview as jest.Mock).mockResolvedValue({ id: "r" });

    const res = await request(app)
      .post("/api/v1/markets/add-review/1")
      .send({ text: "good" });

    expect(res.status).toBe(200);
    expect(reviewService.addReview).toHaveBeenCalledWith({ text: "good", marketId: "1" });
  });
});
