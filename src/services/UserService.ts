import { Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User";
import { IUser } from "../types/modalTypes";
import { BadRequestError, DataNotFoundError } from "../types/Errors";
import generateTokenAndSetCookie from "../utils/generateToken";

class UserService {
	async registerUser(
		userData: Pick<IUser, "username" | "email" | "password" | "role">,
		res: Response
	) {
		const { email } = userData;

		const existingUser = await User.findOne({ email });
		if (existingUser) {
			throw new BadRequestError("User already exists");
		}

		const user = await User.create(userData);

		generateTokenAndSetCookie(res, user._id);

		return {
			message: "User registered successfully",
			user: {
				_id: user._id,
				username: user.username,
				email: user.email,
				role: user.role,
				isProfessional: user.isProfessional,
				isAdmin: user.isAdmin,
			},
		};
	}

	async loginUser(email: string, password: string, res: Response) {
		const user = await User.findOne({ email });

		if (!user) {
			throw new DataNotFoundError("User not found");
		}

		const isMatch = await user.matchPassword(password);
		if (!isMatch) {
			throw new BadRequestError("Invalid credentials");
		}

		generateTokenAndSetCookie(res, user._id);

		return {
			user: {
				_id: user._id,
				username: user.username,
				email: user.email,
				role: user.role,
				photo: user.photo,
				isProfessional: user.isProfessional,
				isAdmin: user.isAdmin,
			},
		};
	}

	async findAllUsers() {
		const users = await User.find({});
		return users.map(user => ({
			_id: user._id,
			username: user.username,
			email: user.email,
			role: user.role,
			photo: user.photo,
			isProfessional: user.isProfessional,
			isAdmin: user.isAdmin,
		}));
	}

	async findUserById(userId: string) {
		const user = await User.findById(userId);
		if (!user) {
			throw new DataNotFoundError("User not found");
		}
		return user;
	}

	async updateUserById(userId: string, updateData: Partial<IUser>) {
		const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
		if (!user) {
			throw new DataNotFoundError("User not found");
		}

		if (updateData.password) {
			updateData.password = await bcrypt.hash(
				updateData.password,
				parseInt(process.env.BCRYPT_SALT_ROUNDS || "10")
			);
		}

		Object.assign(user, updateData);
		await user.save();
		return user;
	}

	async deleteUserById(userId: string) {
		const user = await User.findByIdAndDelete(userId);
		if (!user) {
			throw new DataNotFoundError("User not found");
		}
		return { message: "User deleted successfully" };
	}
}

export default new UserService();
