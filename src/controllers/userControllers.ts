import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middleware/asyncHandler";
import UserServices from "../services/UserService";
import { HttpError, HttpStatusCode } from "../types/Errors";
import { getErrorMessage } from "../types/modalTypes";

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
			next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(error)));
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
			next(new HttpError(HttpStatusCode.UNAUTHORIZED, getErrorMessage(error)));
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
			next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(error)));
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
			next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(error)));
		}
	}
);

/**
 * @description Logout user
 * @name logout
 * @route GET /api/users/logout
 * @access Private
 * @returns {Promise<Response>}
 */

export const logout = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const response = await UserServices.logoutUser(res);
			res.status(200).json(response);
		} catch (error) {
			next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, getErrorMessage(error)));
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
			next(new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage(error)));
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
			next(new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage(error)));
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
			if (!userId) throw new HttpError(HttpStatusCode.UNAUTHORIZED, "User not found");
			const updatedUser = await UserServices.updateUserById(userId, req.body);
			res.json(updatedUser);
		} catch (error) {
			next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, getErrorMessage(error)));
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
			if (!message) throw new HttpError(HttpStatusCode.NOT_FOUND, "User not found");
			res.json(message);
		} catch (error) {
			next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, getErrorMessage(error)));
		}
	}
);
