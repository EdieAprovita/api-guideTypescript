import request from "supertest";
import server from "../../server";
import User from "../../models/User";

jest.mock("bcryptjs", () => ({
	hash: jest.fn().mockResolvedValue("hashedPassword"),
	compare: jest.fn().mockResolvedValue(true),
}));

jest.mock("../../models/User", () => ({
	findOne: jest.fn(),
	create: jest.fn(),
}));

describe("User Registration", () => {
	beforeEach(() => {
		(User.findOne as jest.Mock).mockClear();
		(User.create as jest.Mock).mockClear();
	});

	it("should register a new user if email does not exist", async () => {
		(User.findOne as jest.Mock).mockResolvedValue(null);
		(User.create as jest.Mock).mockResolvedValue({
			_id: "someUserId",
			username: "testUser",
			email: "test@example.com",
			role: "user",
			isProfessional: false,
			token: "someToken",
		});

		const response = await request(server).post("/api/v1/users/register").send({
			username: "testUser",
			email: "test@example.com",
			password: "password123",
			role: "user",
		});

		expect(response.statusCode).toBe(201);
		expect(response.body).toHaveProperty("message", "User created successfully");
		expect(User.create).toBeCalledWith({
			username: "testUser",
			email: "test@example.com",
			password: expect.any(String),
			role: "user",
		});
	});

	it("should return 400 if user already exists", async () => {
		(User.findOne as jest.Mock).mockResolvedValue(true);

		const response = await request(server).post("/api/v1/users/register").send({
			username: "existingUser",
			email: "exist@example.com",
			password: "password123",
			role: "user",
		});

		expect(response.statusCode).toBe(400);
		expect(response.body).toHaveProperty("error", "User already exists");
	});
});