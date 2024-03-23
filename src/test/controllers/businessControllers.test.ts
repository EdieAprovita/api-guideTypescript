import request from "supertest";
import app from "../../app";
import { Business } from "../../models/Business";
import { businessService } from "../../services/BusinessService";

jest.mock("../../models/Business");

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
			(Business.find as jest.Mock).mockResolvedValue(mockBusinesses);

			const response = await request(app).get("/api/v1/businesses");

			expect(response.status).toBe(200);
			expect(businessService.getAll).toHaveBeenCalled();
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
