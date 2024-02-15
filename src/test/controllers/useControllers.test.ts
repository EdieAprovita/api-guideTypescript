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
	  findById: jest.fn(),
  	  findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
	  findOne: jest.fn(),
	  create: jest.fn(),
}));

describe("User Registration", () => {
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

describe("Authenticate User", () => {
    it("should authenticate user as admin", async () => {
        const userData = {
            email: "test@example.com",
            password: "password123",
        };

        (User.findOne as jest.Mock).mockResolvedValue({
            _id: "someUserId",
            username: "testUser",
            email: "test@example.com",
            role: "user",
            isProfessional: false,
			isAdmin: true,
            matchPassword: jest.fn().mockResolvedValue(true),
        });

        const response = await request(app)
            .post("/api/v1/users/login")
            .send(userData);

        expect(response.statusCode).toBe(200);
        expect(response.body.user).toEqual(expect.objectContaining({
            _id: expect.any(String),
            username: "testUser",
            email: "test@example.com",
            role: "user",
            isProfessional: false,
            isAdmin: true,
        }));
        expect(User.findOne).toHaveBeenCalledWith({ email: userData.email });
        expect(response.body.user).not.toHaveProperty('password');
    });
});

  
  
  describe("Get User by ID", () => {
	it("should return user by id", async () => {
	  const userId = "someUserId";
  
	  (User.findById as jest.Mock).mockResolvedValue({
		_id: userId,
		username: "testUser",
		email: "test@example.com",
		role: "user",
		isAdmin: false,
		isProfessional: false,
	  });
  
	  const response = await request(app)
		.get(`/api/v1/users/${userId}`)
		.set("Authorization", `Bearer fakeToken`);
  
	  expect(response.statusCode).toBe(200);
	  expect(response.body.data._id).toBe(userId);
	  expect(User.findById).toHaveBeenCalledWith(userId);
	});
  });
  
  describe("Update User", () => {
	it("should update user details", async () => {
	  const userId = "someUserId";
	  const updateData = {
		username: "updatedUser",
		email: "update@example.com",
		role: "admin",
	  };
  
	  (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({
		_id: userId,
		...updateData,
	  });
  
	  const response = await request(app)
		.put(`/api/v1/users/profile/${userId}`)
		.set("Authorization", `Bearer fakeToken`) 
  
	  expect(response.statusCode).toBe(200);
	  expect(response.body.data.username).toBe(updateData.username);
	  expect(User.findByIdAndUpdate).toHaveBeenCalledWith(userId, updateData, {
		new: true,
		runValidators: true,
	  });
	});
  });
  
  describe("Delete User", () => {
	it("should delete user by id", async () => {
	  const userId = "someUserId";
  
	  (User.findByIdAndDelete as jest.Mock).mockResolvedValue({
		_id: userId,
		username: "testUser",
	  });
  
	  const response = await request(app)
		.delete(`/api/v1/users/${userId}`)
		.set("Authorization", `Bearer fakeToken`);
  
	  expect(response.statusCode).toBe(200);
	  expect(response.body.message).toContain("deleted successfully");
	  expect(User.findByIdAndDelete).toHaveBeenCalledWith(userId);
	});
  });
  