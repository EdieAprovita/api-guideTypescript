import request from "supertest";
import app from "../../app";
import { User, IUser } from "../../models/User";
import UserService from "../../services/UserService";

jest.mock("jsonwebtoken", () => ({
	verify: jest.fn().mockReturnValue({ userId: "someUserId" }),
}));

jest.mock("../../models/User");

jest.mock("../../services/UserService", () => ({
	registerUser: jest.fn(),
	loginUser: jest.fn(),
	findAllUsers: jest.fn(),
	findUserById: jest.fn(),
	updateUserById: jest.fn(),
	deleteUserById: jest.fn(),
}));

jest.mock("../../middleware/authMiddleware", () => ({
	protect: (req, res, next) => {
		req.user = { id: "someUserId", role: "admin" };
		next();
	},
	admin: (req, res, next) => {
		if (req.user.role === "admin") {
			next();
		} else {
			res.status(403).json({ message: "Forbidden" });
		}
	},
	professional: (req, res, next) => {
		if (req.user.role === "professional") {
			next();
		} else {
			res.status(403).json({ message: "Forbidden" });
		}
	},
}));

beforeEach(() => {
	jest.clearAllMocks();
	User.findById = jest.fn().mockResolvedValue({
		_id: "mockUserId",
		username: "mockUser",
		email: "mock@example.com",
		isAdmin: true,
		isProfessional: true,
	});
});

describe("User Registration", () => {
	it("should register a new user if email does not exist", async () => {
		UserService.registerUser = jest.fn().mockResolvedValue({
			message: "User registered successfully",
			user: {
				_id: "someUserId",
				username: "testUser",
				email: "test@example.com",
				role: "user",
			},
		});

		const response = await request(app).post("/api/v1/users/register").send({
			username: "testUser",
			email: "test@example.com",
			password: "password123",
		});

		expect(response.statusCode).toBe(201);
	});
});

describe("User Login", () => {
	it("should authenticate user and return token", async () => {
		UserService.loginUser = jest.fn().mockResolvedValue({
			_id: "someUserId",
			username: "testUser",
			email: "test@example.com",
			token: "someToken",
		});

		const response = await request(app).post("/api/v1/users/login").send({
			email: "test@example.com",
			password: "password123",
		});

		expect(response.statusCode).toBe(200);
		expect(response.body).toHaveProperty("token");
		expect(UserService.loginUser).toHaveBeenCalledWith(
			"test@example.com",
			"password123",
			expect.anything()
		);
	});
});

describe("Get All Users", () => {
	it("should return all users", async () => {
		User.findById = jest.fn().mockResolvedValue({
			_id: "mockUserId",
			username: "mockUser",
			email: "mock@example.com",
			role: "admin",
		});

		UserService.findAllUsers = jest.fn().mockResolvedValue([
			{ _id: "1", username: "testUser1", email: "test1@example.com", role: "user" },
			{ _id: "2", username: "testUser2", email: "test2@example.com", role: "user" },
		]);

		const response = await request(app).get("/api/v1/users/");

		expect(response.statusCode).toBe(200);
		expect(response.body.length).toBeGreaterThan(0);
		expect(UserService.findAllUsers).toHaveBeenCalledTimes(1);
	});
});

describe("Get User by ID", () => {
	it("should return user by id", async () => {
		const userId = "1";
		UserService.findUserById = jest.fn().mockResolvedValue({
			_id: userId,
			username: "testUser",
			email: "test@example.com",
			role: "user",
		});

		const response = await request(app).get(`/api/v1/users/${userId}`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toHaveProperty("_id", userId);
		expect(UserService.findUserById).toHaveBeenCalledWith(userId);
	});
});

describe("Update User Profile", () => {
	it("should update user details", async () => {
		const userId = "1";
		const updateData: Partial<IUser> = {
			username: "updatedUser",
			email: "update@example.com",
			password: "newPassword",
			role: "user",
		};

		UserService.updateUserById = jest.fn().mockResolvedValue({
			_id: userId,
			...updateData,
		});

		const result = await UserService.updateUserById(userId, updateData);

		expect(result).toHaveProperty("_id", userId);
		expect(result).toHaveProperty("username", updateData.username);
		expect(result).toHaveProperty("email", updateData.email);
	});
});

describe("Delete User", () => {
	it("should delete user by id", async () => {
		const userId = "1";
		UserService.deleteUserById = jest.fn().mockResolvedValue("User deleted successfully");

		const response = await request(app).delete(`/api/v1/users/${userId}`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual("User deleted successfully");
		expect(UserService.deleteUserById).toHaveBeenCalledWith(userId);
	});
});
