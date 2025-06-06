import request from "supertest";
jest.mock("../../config/db");
import app from "../../app";
import { restaurantService } from "../../services/RestaurantService";
import { reviewService } from "../../services/ReviewService";
import geoService from "../../services/GeoService";

jest.mock("../../services/GeoService", () => ({
  __esModule: true,
  default: { geocodeAddress: jest.fn() },
}));

jest.mock("../../services/RestaurantService", () => ({
  restaurantService: {
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
  protect: (req, _res, next) => { req.user = { id: "user", role: "admin" }; next(); },
  admin: (_req, _res, next) => next(),
  professional: (_req, _res, next) => next(),
}));

beforeEach(() => { jest.clearAllMocks(); });

describe("Restaurant Controllers", () => {
  it("gets restaurants", async () => {
    (restaurantService.getAll as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get("/api/v1/restaurants");
    expect(res.status).toBe(200);
    expect(restaurantService.getAll).toHaveBeenCalled();
  });

  it("updates a restaurant", async () => {
    (geoService.geocodeAddress as jest.Mock).mockResolvedValue({ lat: 2, lng: 3 });
    (restaurantService.updateById as jest.Mock).mockResolvedValue({ id: "1" });

    await request(app)
      .put("/api/v1/restaurants/update/1")
      .send({ address: "b" });

    expect(geoService.geocodeAddress).toHaveBeenCalledWith("b");
    expect(restaurantService.updateById).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({ address: "b", location: { type: "Point", coordinates: [3, 2] } })
    );
  });
});
