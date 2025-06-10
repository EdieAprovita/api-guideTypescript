import request from "supertest";
import { geoService } from "./controllerTestSetup";
import app from "../../app";
import { sanctuaryService } from "../../services/SanctuaryService";
import { reviewService } from "../../services/ReviewService";

jest.mock("../../services/SanctuaryService", () => ({
  sanctuaryService: {
    getAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
  },
}));

describe("Sanctuary Controllers", () => {
  it("creates a sanctuary with geocode", async () => {
    (geoService.geocodeAddress as jest.Mock).mockResolvedValue({ lat: 1, lng: 2 });
    (sanctuaryService.create as jest.Mock).mockResolvedValue({ id: "1" });

    await request(app)
      .post("/api/v1/sanctuaries")
      .send({ address: "a" });

    expect(geoService.geocodeAddress).toHaveBeenCalledWith("a");
    expect(sanctuaryService.create).toHaveBeenCalledWith(
      expect.objectContaining({ address: "a", location: { type: "Point", coordinates: [2, 1] } })
    );
  });

  it("adds a review", async () => {
    (reviewService.addReview as jest.Mock).mockResolvedValue({ id: "r" });
    const res = await request(app)
      .post("/api/v1/sanctuaries/add-review/1")
      .send({ text: "good" });
    expect(res.status).toBe(200);
    expect(reviewService.addReview).toHaveBeenCalledWith({ text: "good", sanctuaryId: "1" });
  });
});
