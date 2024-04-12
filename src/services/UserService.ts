import { Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";

import { User, IUser } from "../models/User";
import { HttpError, HttpStatusCode } from "../types/Errors";
import { getErrorMessage } from "../types/modalTypes";
import generateTokenAndSetCookie from "../utils/generateToken";

/**
 * @description User service class
 * @name UserService
 * @class
 * @returns {Object}
 */

class UserService {
	async registerUser(
		userData: Pick<IUser, "username" | "email" | "password">,
		res: Response
	) {
		const { email } = userData;

		const existingUser = await User.findOne({ email });
		if (existingUser) {
			throw new HttpError(
				HttpStatusCode.BAD_REQUEST,
				getErrorMessage("User already exists")
			);
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
				isAdmin: user.isAdmin,
			},
		};
	}

	async loginUser(email: string, password: string, res: Response) {
		const user = await User.findOne({ email }).select("+password");

		if (!user) {
			throw new HttpError(
				HttpStatusCode.UNAUTHORIZED,
				getErrorMessage("Invalid credentials")
			);
		}

		const isMatch = await user.matchPassword(password);
		if (!isMatch) {
			throw new HttpError(
				HttpStatusCode.UNAUTHORIZED,
				getErrorMessage("Invalid credentials")
			);
		}

		generateTokenAndSetCookie(res, user._id);

		return {
			user: {
				_id: user._id,
				username: user.username,
				email: user.email,
				role: user.role,
				photo: user.photo,
			},
		};
	}

	async forgotPassword(email: string) {
		const user = await User.findOne({ email });
		if (!user) {
			throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage("User not found"));
		}

		const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
			expiresIn: "1h",
		});

		const transporter = nodemailer.createTransport({
			service: "gmail",
			auth: {
				user: process.env.EMAIL_USER,
				pass: process.env.EMAIL_PASS,
			},
		});

		await transporter.sendMail({
			from: process.env.EMAIL_USER,
			to: user.email,
			subject: "Password reset request",
			text:
				"Click on the link to reset your password: " +
				process.env.CLIENT_URL +
				"/reset-password/" +
				resetToken,
		});

		return { message: "Email sent with password reset instructions" };
	}

	async resetPassword(resetToken: string, newPassword: string) {
		const decoded = jwt.verify(resetToken, process.env.JWT_SECRET) as JwtPayload;
		if (!decoded) {
			throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage("Invalid token"));
		}

		const user = await User.findById(decoded.userId);
		if (!user) {
			throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage("User not found"));
		}

		const hashedPassword = await bcrypt.hash(newPassword, 10);
		user.password = hashedPassword;
		await user.save();

		return { message: "Password reset successful" };
	}

	async logoutUser(res: Response) {
		res.clearCookie("jwt");
		return { message: "User logged out successfully" };
	}

	async findAllUsers() {
		const users = await User.find({});
		return users.map(user => ({
			_id: user._id,
			username: user.username,
			email: user.email,
			role: user.role,
			photo: user.photo,
		}));
	}

	async findUserById(userId: string) {
		const user = await User.findById(userId);
		if (!user) {
			throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage("User not found"));
		}
		return user;
	}

	async updateUserById(userId: string, updateData: Partial<IUser>) {
		const user = await User.findById(userId);
		if (!user) {
			throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage("User not found"));
		}

		if (updateData.password) {
			user.password = updateData.password;
		}

		if (user) {
			user.username = updateData.username || user.username;
			user.email = updateData.email || user.email;
			user.photo = updateData.photo || user.photo;
			user.role = updateData.role || user.role;
		}

		const updatedUser = await user.save();

		return updatedUser;
	}

	async deleteUserById(userId: string) {
		const user = await User.findByIdAndDelete(userId);
		if (!user) {
			throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage("User not found"));
		}
		return { message: "User deleted successfully" };
	}
}

export default new UserService();
