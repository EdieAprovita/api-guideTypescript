import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middleware/asyncHandler";
import UserServices from "../services/UserService";
import {
	BadRequestError,
	DataNotFoundError,
	InternalServerError,
	NotAuthorizedError,
} from "../types/Errors";

/**
 * @description Authenticate user and get token
 * @name authUser
 * @route POST /api/users/login
 * @access Public
 */

export const registerUser = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const result = await UserServices.registerUser(req.body, res);
			res.status(201).json(result);
		} catch (error) {
			throw new InternalServerError("Unable to register user");
		}
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
		try {
			const { email, password } = req.body;
			const result = await UserServices.loginUser(email, password, res);
			res.status(200).json(result);
		} catch (error) {
			throw new NotAuthorizedError("Invalid credentials");
		}
	}
);

/**
 * @description Forgot password
 * @name forgotPassword
 * @route POST /api/users/forgot-password
 * @access Private
 * @returns {Promise<Response>}
 */

export const forgotPassword = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { email } = req.body;
			const response = await UserServices.forgotPassword(email);
			res.status(200).json(response);
		} catch (error) {
			throw new DataNotFoundError("User not found");
		}
	}
);

/**
 * @description Reset password
 * @name resetPassword
 * @route POST /api/users/reset-password
 * @access Private
 * @returns {Promise<Response>}
 */

export const resetPassword = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { token, newPassword } = req.body;
			const response = await UserServices.resetPassword(token, newPassword);
			res.status(200).json(response);
		} catch (error) {
			throw new BadRequestError("Unable to reset password");
		}
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
		try {
			const users = await UserServices.findAllUsers();
			res.status(200).json(users);
		} catch (error) {
			throw new DataNotFoundError("Users not found");
		}
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
		try {
			const user = await UserServices.findUserById(req.params.id);
			res.status(200).json(user);
		} catch (error) {
			throw new DataNotFoundError("User not found");
		}
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
		try {
			const userId = req.user?._id;
			if (!userId) throw new Error("User ID not found in request");
			const updatedUser = await UserServices.updateUserById(userId, req.body);
			res.json(updatedUser);
		} catch (error) {
			throw new BadRequestError("Unable to update user profile");
		}
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
		try {
			const message = await UserServices.deleteUserById(req.params.id);
			res.json(message);
		} catch (error) {
			throw new BadRequestError("Unable to delete user");
		}
	}
);
