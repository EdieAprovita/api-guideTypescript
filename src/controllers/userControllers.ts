import { Request, Response } from "express";

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

export const registerUser = async (req: Request, res: Response) => {
	try {
		const { username, email, password, role } = req.body;

		const userExists = await User.findOne({ email, username });

		if (userExists) {
			return res.status(400).json({
				message: "User already exists",
				success: false,
				error: `User ${username} with email ${email} already exists`,
			});
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
		return res.status(500).json({
			message: "The user could not be created",
			success: false,
			error: `${error}`,
		});
	}
};

/**
 * @description Authenticate user and get token
 * @name authUser
 * @route POST /api/users/login
 * @access Public
 */

export const loginUser = async (req: Request, res: Response) => {
	try {
		const { email, password, username } = req.body;

		const user = await User.findOne({ email, username });

		if (!user) {
			return res.status(401).json({
				message: `Ùser ${username} with email ${email} not found`,
				success: false,
				error: Error,
			});
		}

		const isMatch = user.isModified(password);

		if (!isMatch) {
			return res.status(401).json({
				message: `Invalid password`,
				success: false,
				error: Error,
			});
		}

		const token = generateToken(user._id ?? "");

		return res.status(200).json({
			token,
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
		return res.status(500).json({
			message: "The user could not be created",
			success: false,
			error: `${error}`,
		});
	}
};

/**
 * @description Get all users
 * @name getUsers
 * @route GET /api/users
 * @access Private/Admin
 * @returns {Promise<Response>}
 * */

export const getUsers = async (req: Request, res: Response): Promise<Response> => {
	try {
		const users: IUser[] = await User.find({});
		return res.status(200).json({
			message: "Users fetched successfully",
			success: true,
			count: users.length,
			data: users,
		});
	} catch (error) {
		return res.status(500).json({
			message: `${error}`,
			success: false,
			error: "Server Error",
		});
	}
};

/**
 * @description Get single user by Id
 * @name getUser
 * @route GET /api/users/:id
 * @access Private/Admin
 * @returns {Promise<Response>}
 * */

export const getUserById = async (req: Request, res: Response): Promise<Response> => {
	const user: IUser | null = await User.findById(req.params.id);

	if (!user) {
		return res.status(200).json({
			success: false,
			error: "User not found",
		});
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
};

/**
 * @description Update user
 * @name updateUser
 * @route PUT /api/users/:id
 * @access Private/Admin
 * @returns {Promise<Response>}
 * */

export const updateUserByAdmin = async (
	req: Request,
	res: Response
): Promise<Response> => {
	const user: IUser | null = await User.findById(req.params.id);

	if (!user) {
		return res.status(200).json({
			success: false,
			error: "User not found",
		});
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
};

/**
 * @description Update user profile
 * @name updateUserProfile
 * @route PUT /api/users/profile
 * @access Private
 * @returns {Promise<Response>}
 */

export const updateUserProfile = async (
	req: Request,
	res: Response
): Promise<Response> => {
	const user: IUser | null = (await User.findById(req.params._id)) as IUser | null;

	if (!user) {
		return res.status(404).json({
			success: false,
			error: "User not found",
		});
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
};

/**
 * @description Delete user
 * @name deleteUser
 * @route DELETE /api/users/:id
 * @access Private/Admin
 * @returns {Promise<Response>}
 * */

export const deleteUserByAdmin = async (
	req: Request,
	res: Response
): Promise<Response> => {
	const user = await User.findById(req.params.id);

	if (!user) {
		return res.status(404).json({
			success: false,
			error: "User not found",
		});
	} else {
		await User.findByIdAndDelete(req.params.id);

		return res.status(200).json({
			message: `User profile for ${user.username} deleted successfully`,
			success: true,
		});
	}
};
