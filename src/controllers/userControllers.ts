import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middleware/asyncHandler";
import { validationResult } from "express-validator";

import { BadRequestError, InternalServerError, DataNotFoundError } from "../types/Errors";
import { IUser } from "../types/modalTypes";
import User from "../models/User";
import { generateToken } from "../utils/generateToken";

/**
 * @description Register a new user
 * @name registerUser
 * @route POST /api/users
 * @access Public
 * @returns {Promise<Response>}
 */

export const registerUser = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { username, email, password, role } = req.body;

			const userExists = await User.findOne({ email });

			if (userExists) {
				throw new BadRequestError("User already exists");
			}

			const user: IUser = await User.create({
				username,
				email,
				password,
				role,
			});

			if (user) {
				return res.status(201).json({
					message: "User created successfully",
					_id: user._id,
					username: user.username,
					email: user.email,
					role: user.role,
					isProfessional: user.isProfessional,
					token: generateToken(user._id ?? ""),
				});
			}
		} catch (error) {
			next(new InternalServerError(`${error}`));
		}
	}
);

/**
 * @description Authenticate user and get token
 * @name authUser
 * @route POST /api/users/login
 * @access Public
 */

export const loginUser = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { email, password } = req.body;

			const user = await User.findOne({ email });

			if (!user) {
				throw new DataNotFoundError("User not found");
			}

			const isMatch = await user.matchPassword(password);

			if (!isMatch) {
				throw new BadRequestError("Invalid credentials");
			}

			return res.status(200).json({
				token: generateToken(user._id ?? ""),
				user: {
					_id: user._id,
					username: user.username,
					email: user.email,
					role: user.role,
					photo: user.photo,
					isProfessional: user.isProfessional,
					isAdmin: user.isAdmin,
				},
			});
		} catch (error) {
			next(new InternalServerError(`${error}`));
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
	async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
		try {
			const users: IUser[] = await User.find({});
			return res.status(200).json({
				message: "Users fetched successfully",
				success: true,
				count: users.length,
				data: users,
			});
		} catch (error) {
			next(new InternalServerError(`${error}`));
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
	async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
		const user: IUser | null = await User.findById(req.params.id);

		if (!user) {
			throw new DataNotFoundError("User not found");
		} else {
			return res.status(200).json({
				message: `User profile for ${user.username}`,
				_id: user._id,
				username: user.username,
				email: user.email,
				role: user.role,
				photo: user.photo,
				isAdmin: user.isAdmin,
				isProfessional: user.isProfessional,
				createdAt: user.timestamps.createdAt,
				updatedAt: user.timestamps.updatedAt,
				success: true,
			});
		}
	}
);

/**
 * @description Update user
 * @name updateUser
 * @route PUT /api/users/:id
 * @access Private/Admin
 * @returns {Promise<Response>}
 * */

export const updateUserByAdmin = asyncHandler(
	async (req: Request, res: Response): Promise<Response> => {
		const user: IUser | null = await User.findById(req.params.id);

		if (!user) {
			throw new DataNotFoundError("User not found");
		} else {
			user.username = req.body.username || user.username;
			user.email = req.body.email || user.email;
			user.role = req.body.role || user.role;
			user.photo = req.body.photo || user.photo;
			user.isProfessional = req.body.isProfessional || user.isProfessional;
			user.isAdmin = req.body.isAdmin || user.isAdmin;

			const updatedUser = await user.save();

			return res.status(200).json({
				message: `User profile for ${user.username} updated successfully`,
				_id: updatedUser._id,
				username: updatedUser.username,
				email: updatedUser.email,
				role: updatedUser.role,
				photo: updatedUser.photo,
				isAdmin: updatedUser.isAdmin,
				isProfessional: updatedUser.isProfessional,
				createdAt: updatedUser.timestamps.createdAt,
				updatedAt: updatedUser.timestamps.updatedAt,
				success: true,
			});
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
	async (req: Request, res: Response): Promise<Response> => {
		const user: IUser | null = (await User.findById(req.params._id)) as IUser | null;

		if (!user) {
			throw new DataNotFoundError("User not found");
		} else {
			user.username = req.body.username || user.username;
			user.email = req.body.email || user.email;
			user.photo = req.body.photo || user.photo;

			if (req.body.password) {
				user.password = req.body.password;
			}

			const updatedUser: IUser = await user.save();

			return res.status(200).json({
				message: `User profile for ${updatedUser.username} updated successfully`,
				_id: updatedUser._id,
				username: updatedUser.username,
				email: updatedUser.email,
				role: updatedUser.role,
				photo: updatedUser.photo,
				isAdmin: updatedUser.isAdmin,
				isProfessional: updatedUser.isProfessional,
				createdAt: updatedUser.timestamps.createdAt,
				updatedAt: updatedUser.timestamps.updatedAt,
				success: true,
			});
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

export const deleteUserByAdmin = asyncHandler(
	async (req: Request, res: Response): Promise<Response> => {
		const user = await User.findById(req.params.id);

		if (!user) {
			throw new DataNotFoundError("User not found");
		} else {
			await User.findByIdAndDelete(req.params.id);

			return res.status(200).json({
				message: `User profile for ${user.username} deleted successfully`,
				success: true,
			});
		}
	}
);

/**
 * @description Get user profile
 * @name getUserProfile
 * @route GET /api/users/profile
 * @access Private
 * @returns {Promise<Response>}
 * */

export const updateUser = asyncHandler(
	async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
		const userId = req.params.id;
		const { username, email, role, photo } = req.body;

		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				next(new BadRequestError("Invalid input"));
			}

			const userExists = await User.findByIdAndUpdate({
				$or: [{ email }, { username }],
				_id: { $ne: userId },
			});
			if (userExists) {
				return res.status(400).json({
					success: false,
					error: "User already exists",
				});
			}

			const updatedUser = await User.findByIdAndUpdate(
				userId,
				{ username, email, photo, role, isProfessional: false },
				{ new: true, runValidators: true }
			);

			if (!updatedUser) {
				next(new DataNotFoundError("User not found"));
			}

			return res.status(200).json({
				message: "User updated successfully",
				user: {
					_id: updatedUser._id,
					username: updatedUser.username,
					email: updatedUser.email,
					role: updatedUser.role,
					photo: updatedUser.photo,
					isProfessional: updatedUser.isProfessional,
				},
			});
		} catch (error) {
			next(new InternalServerError(`${error}`));
		}
	}
);
