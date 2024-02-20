import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middleware/asyncHandler";
import UserServices from "../services/UserService";

/**
 * @description Authenticate user and get token
 * @name authUser
 * @route POST /api/users/login
 * @access Public
 */

export const registerUser = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const result = await UserServices.registerUser(req.body, res);
		res.status(201).json(result);
	}
);

/**
 * @description Register a new user
 * @name registerUser
 * @route POST /api/users
 * @access Public
 * @returns {Promise<Response>}
 */

export const loginUser = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const { email, password } = req.body;
		const result = await UserServices.loginUser(email, password, res);
		res.status(200).json(result);
	}
);

/**
 * @description Get all users
 * @name getUsers
 * @route GET /api/users
 * @access Private/Admin
 * @returns {Promise<Response>}
 * */

export const getUsers = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const users = await UserServices.findAllUsers();
		res.json(users);
	}
);

/**
 * @description Get single user by Id
 * @name getUser
 * @route GET /api/users/:id
 * @access Private/Admin
 * @returns {Promise<Response>}
 * */

export const getUserById = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const user = await UserServices.findUserById(req.params.id);
		res.json(user);
	}
);

/**
 * @description Update user profile
 * @name updateUserProfile
 * @route PUT /api/users/profile
 * @access Private
 * @returns {Promise<Response>}
 */

export const updateUserProfile = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const userId = req.user?._id;
		if (!userId) throw new Error("User ID not found in request");
		const updatedUser = await UserServices.updateUserById(userId, req.body);
		res.json(updatedUser);
	}
);

/**
 * @description Delete user
 * @name deleteUser
 * @route DELETE /api/users/:id
 * @access Private/Admin
 * @returns {Promise<Response>}
 * */

export const deleteUserById = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const message = await UserServices.deleteUserById(req.params.id);
		res.json(message);
	}
);
