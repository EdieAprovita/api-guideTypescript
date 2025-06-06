import request from "supertest";
import { geoService } from "./controllerTestSetup";
import "./controllerTestSetup";
import app from "../../app";
import { restaurantService } from "../../services/RestaurantService";
import { reviewService } from "../../services/ReviewService";

jest.mock("../../services/RestaurantService", () => ({
  restaurantService: {
    getAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
  },
}));

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

  it("creates a restaurant", async () => {
    (geoService.geocodeAddress as jest.Mock).mockResolvedValue({ lat: 1, lng: 2 });
    (restaurantService.create as jest.Mock).mockResolvedValue({ id: "1" });

    await request(app)
      .post("/api/v1/restaurants/create")
      .send({ address: "a" });

    expect(geoService.geocodeAddress).toHaveBeenCalledWith("a");
    expect(restaurantService.create).toHaveBeenCalledWith(
      expect.objectContaining({ address: "a", location: { type: "Point", coordinates: [2, 1] } })
    );
  });

  it("adds a review", async () => {
    (reviewService.addReview as jest.Mock).mockResolvedValue({ id: "r" });

    const res = await request(app)
      .post("/api/v1/restaurants/add-review/1")
      .send({ text: "good" });

    expect(res.status).toBe(200);
    expect(reviewService.addReview).toHaveBeenCalledWith({ text: "good", restaurantId: "1" });
  });

  it("deletes a restaurant", async () => {
    (restaurantService.deleteById as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app).delete("/api/v1/restaurants/delete/1");

    expect(res.status).toBe(200);
    expect(restaurantService.deleteById).toHaveBeenCalledWith("1");
  });
});
