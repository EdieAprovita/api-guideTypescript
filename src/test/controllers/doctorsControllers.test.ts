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
});
