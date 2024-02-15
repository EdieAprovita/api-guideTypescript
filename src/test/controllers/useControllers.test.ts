import request from "supertest";
import app from "../../app";
import User from "../../models/User";

jest.mock("bcryptjs", () => ({
	hash: jest.fn().mockResolvedValue("hashedPassword"),
	compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../middleware/authMiddleware', () => ({
	protect: jest.fn((req, res, next) => next()),
    admin: jest.fn((req, res, next) => next()),
}));

jest.mock("../../models/User", () => ({
	find: jest.fn().mockResolvedValue([
		{ _id: "1", username: "testUser1", email: "test1@example.com", role: "user" },
		{ _id: "2", username: "testUser2", email: "test2@example.com", role: "user" }
	  ]),	
	  findOne: jest.fn(),
	  create: jest.fn(),
}));

describe("User Registration", () => {
	let serverInstance;

	beforeAll(() => {
		const PORT = process.env.TEST_PORT || 5001;
		serverInstance = app.listen(PORT);
	});

	afterAll(done => {
		serverInstance.close(done);
	});

	beforeEach(() => {
		jest.clearAllMocks();
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

		const response = await request(app).post("/api/v1/users/register").send({
			username: "testUser",
			email: "test@example.com",
			password: "password123",
			role: "user",
		});

		expect(response.statusCode).toBe(201);
		expect(response.body.message).toEqual("User created successfully");
		expect(User.create).toHaveBeenCalledWith({
			username: "testUser",
			email: "test@example.com",
			password: expect.any(String),
			role: "user",
		});
	});

	it("should return 400 if user already exists", async () => {
		(User.findOne as jest.Mock).mockResolvedValue({
			_id: "someUserId",
			username: "existingUser",
			email: "test@example.com",
			password: "password123",
			role: "user",
		});

		const response = await request(app).post("/api/v1/users/register").send({
			username: "existingUser",
			email: "exist@example.com",
			password: "password123",
			role: "user",
		});

		expect(response.statusCode).toBe(400);
	});
});

describe("Get All Users", () => {
	it("should return all users", async () => {
	  const response = await request(app)
	  .get("/api/v1/users")
	  .set("Authorization", `Bearer fakeToken`);
  
	  expect(response.statusCode).toBe(200);
	  expect(response.body).toEqual({
		success: true,
		message: "Users fetched successfully",
		count: 2,
		data: [
		  { _id: "1", username: "testUser1", email: "test1@example.com", role: "user" },
		  { _id: "2", username: "testUser2", email: "test2@example.com", role: "user" }
		]
	  });
	  expect(User.find).toHaveBeenCalledTimes(1);
	});
});
  
