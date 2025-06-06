import request from "supertest";
// Prevent database connection attempts when importing the app
jest.mock("../../config/db");
import app from "../../app";
import { businessService } from "../../services/BusinessService";
import geoService from "../../services/GeoService";

jest.mock("../../services/GeoService", () => ({
        __esModule: true,
        default: { geocodeAddress: jest.fn() },
}));

jest.mock("../../middleware/authMiddleware", () => ({
        protect: (req, res, next) => {
                req.user = { id: "user", role: "admin" };
                next();
        },
        admin: (req, res, next) => next(),
        professional: (req, res, next) => next(),
}));

jest.mock("../../services/BusinessService", () => ({
	businessService: {
		getAll: jest.fn(),
		findById: jest.fn(),
		create: jest.fn(),
		updateById: jest.fn(),
		deleteById: jest.fn(),
	},
}));

beforeEach(() => {
	jest.clearAllMocks();
});

describe("Business Controllers Tests", () => {
	describe("Get all businesses", () => {
		it("should get all businesses", async () => {
			const mockBusinesses = [
				{
					_id: "mockBusinessId",
					namePlace: "mockBusiness",
					address: "mockAddress",
					contact: {
						phone: "1234567890",
						email: "test@example.com",
					},
					image: "mockImage",
					hours: [
						{
							dayOfWeek: "Monday",
							openTime: "8:00",
							closeTime: "18:00",
						},
					],
				},
			];
                        (businessService.getAll as jest.Mock).mockResolvedValueOnce(mockBusinesses);

			const response = await request(app).get("/api/v1/businesses");

                        expect(response.status).toBe(200);
                        expect(businessService.getAll).toHaveBeenCalled();
                        expect(response.body).toEqual({
                                success: true,
                                message: "Businesses fetched successfully",
                                data: mockBusinesses,
                        });
                });
        });

        describe("Get business by id", () => {
                it("should get business by id", async () => {
                        const response = await request(app).get("/api/v1/businesses/mockBusinessId");

                        expect(response.status).toBe(200);
                        expect(businessService.findById).toHaveBeenCalledWith("mockBusinessId");
                });
        });

        describe("Create business", () => {
                it("sets location when geocoding succeeds", async () => {
                        (geoService.geocodeAddress as jest.Mock).mockResolvedValue({ lat: 10, lng: 20 });
                        (businessService.create as jest.Mock).mockResolvedValue({ id: "1" });

                        await request(app)
                                .post("/api/v1/businesses/create")
                                .send({ namePlace: "My Shop", address: "123 st" });

                        expect(geoService.geocodeAddress).toHaveBeenCalledWith("123 st");
                        expect(businessService.create).toHaveBeenCalledWith(
                                expect.objectContaining({
                                        namePlace: "My Shop",
                                        address: "123 st",
                                        location: { type: "Point", coordinates: [20, 10] },
                                })
                        );
                });

                it("leaves location unset when geocoding fails", async () => {
                        (geoService.geocodeAddress as jest.Mock).mockResolvedValue(null);
                        (businessService.create as jest.Mock).mockResolvedValue({ id: "1" });

                        await request(app)
                                .post("/api/v1/businesses/create")
                                .send({ namePlace: "Shop", address: "bad" });

                        expect(geoService.geocodeAddress).toHaveBeenCalledWith("bad");
                        expect(businessService.create).toHaveBeenCalledWith(
                                expect.objectContaining({
                                        namePlace: "Shop",
                                        address: "bad",
                                })
                        );
                });
        });

        describe("Update business", () => {
                it("geocodes updated address", async () => {
                        (geoService.geocodeAddress as jest.Mock).mockResolvedValue({ lat: 5, lng: 6 });
                        (businessService.updateById as jest.Mock).mockResolvedValue({ id: "1" });

                        await request(app)
                                .put("/api/v1/businesses/update/1")
                                .send({ address: "456 road" });

                        expect(geoService.geocodeAddress).toHaveBeenCalledWith("456 road");
                        expect(businessService.updateById).toHaveBeenCalledWith(
                                "1",
                                expect.objectContaining({
                                        address: "456 road",
                                        location: { type: "Point", coordinates: [6, 5] },
                                })
                        );
                });

                it("does not set location when geocoding returns null", async () => {
                        (geoService.geocodeAddress as jest.Mock).mockResolvedValue(null);
                        (businessService.updateById as jest.Mock).mockResolvedValue({ id: "1" });

                        await request(app)
                                .put("/api/v1/businesses/update/1")
                                .send({ address: "no" });

                        expect(geoService.geocodeAddress).toHaveBeenCalledWith("no");
                        expect(businessService.updateById).toHaveBeenCalledWith(
                                "1",
                                expect.objectContaining({ address: "no" })
                        );
                });
        });
});
