import request from "supertest";
// Prevent database connection attempts when importing the app
jest.mock("../../config/db");
import app from "../../app";
import { businessService } from "../../services/BusinessService";

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
                        (businessService.getAll as jest.Mock).mockResolvedValue(mockBusinesses);

			const response = await request(app).get("/api/v1/businesses");

                        expect(response.status).toBe(200);
                        expect(businessService.getAll).toHaveBeenCalled();
                        expect(response.body.data).toEqual(mockBusinesses);
                });
        });

	describe("Get business by id", () => {
		it("should get business by id", async () => {
			const response = await request(app).get("/api/v1/businesses/mockBusinessId");

			expect(response.status).toBe(200);
			expect(businessService.findById).toHaveBeenCalledWith("mockBusinessId");
		});
	});
});
