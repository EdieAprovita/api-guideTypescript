import request from "supertest";
import { geoService } from "./controllerTestSetup";
import app from "../../app";
import { marketsService } from "../../services/MarketsService";
import { reviewService } from "../../services/ReviewService";

jest.mock("../../services/MarketsService", () => ({
  marketsService: {
    getAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
  },
}));

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

  it("updates a market", async () => {
    (geoService.geocodeAddress as jest.Mock).mockResolvedValue({ lat: 3, lng: 4 });
    (marketsService.updateById as jest.Mock).mockResolvedValue({ id: "1" });

    await request(app)
      .put("/api/v1/markets/update/1")
      .send({ address: "b" });

    expect(geoService.geocodeAddress).toHaveBeenCalledWith("b");
    expect(marketsService.updateById).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({ address: "b", location: { type: "Point", coordinates: [4, 3] } })
    );
  });

  it("deletes a market", async () => {
    (marketsService.deleteById as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app).delete("/api/v1/markets/delete/1");

    expect(res.status).toBe(200);
    expect(marketsService.deleteById).toHaveBeenCalledWith("1");
  });
});
