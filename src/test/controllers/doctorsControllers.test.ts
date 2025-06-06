import request from "supertest";
jest.mock("../../config/db");
import app from "../../app";
import { doctorService } from "../../services/DoctorService";
import { reviewService } from "../../services/ReviewService";
import geoService from "../../services/GeoService";

jest.mock("../../services/GeoService", () => ({
  __esModule: true,
  default: { geocodeAddress: jest.fn() },
}));

jest.mock("../../services/DoctorService", () => ({
  doctorService: {
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

describe("Doctors Controllers", () => {
  it("gets doctors", async () => {
    (doctorService.getAll as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get("/api/v1/doctors");
    expect(res.status).toBe(200);
    expect(doctorService.getAll).toHaveBeenCalled();
  });

  it("deletes a doctor", async () => {
    (doctorService.deleteById as jest.Mock).mockResolvedValue(undefined);
    const res = await request(app).delete("/api/v1/doctors/delete/1");
    expect(res.status).toBe(200);
    expect(doctorService.deleteById).toHaveBeenCalledWith("1");
  });

  it("creates a doctor", async () => {
    (geoService.geocodeAddress as jest.Mock).mockResolvedValue({ lat: 1, lng: 2 });
    (doctorService.create as jest.Mock).mockResolvedValue({ id: "1" });

    await request(app)
      .post("/api/v1/doctors/create")
      .send({ address: "a" });

    expect(geoService.geocodeAddress).toHaveBeenCalledWith("a");
    expect(doctorService.create).toHaveBeenCalledWith(
      expect.objectContaining({ address: "a", location: { type: "Point", coordinates: [2, 1] } })
    );
  });

  it("updates a doctor", async () => {
    (geoService.geocodeAddress as jest.Mock).mockResolvedValue({ lat: 3, lng: 4 });
    (doctorService.updateById as jest.Mock).mockResolvedValue({ id: "1" });

    await request(app)
      .put("/api/v1/doctors/update/1")
      .send({ address: "b" });

    expect(geoService.geocodeAddress).toHaveBeenCalledWith("b");
    expect(doctorService.updateById).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({ address: "b", location: { type: "Point", coordinates: [4, 3] } })
    );
  });

  it("adds a review", async () => {
    (reviewService.addReview as jest.Mock).mockResolvedValue({ id: "r" });

    const res = await request(app)
      .post("/api/v1/doctors/add-review/1")
      .send({ text: "good" });

    expect(res.status).toBe(200);
    expect(reviewService.addReview).toHaveBeenCalledWith({ text: "good", businessId: "1" });
  });
});
