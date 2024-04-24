import { Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";

import { User, IUser } from "../models/User";
import { HttpError, HttpStatusCode } from "../types/Errors";
import { getErrorMessage } from "../types/modalTypes";
import generateTokenAndSetCookie from "../utils/generateToken";

abstract class BaseService {
	protected async validateUserNotExists(email: string) {
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			throw new HttpError(
				HttpStatusCode.BAD_REQUEST,
				getErrorMessage("User already exists")
			);
		}
	}

	protected async getUserByEmail(email: string) {
		const user = await User.findOne({ email }).select("+password");
		this.validateUserExists(user);
		return user;
	}

	protected validateUserCredentials(user: IUser | null, password: string) {
		if (!user || !user.matchPassword(password)) {
			throw new HttpError(
				HttpStatusCode.UNAUTHORIZED,
				getErrorMessage("Invalid credentials")
			);
		}
	}

	protected async generateResetToken(user: IUser) {
		return jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
			expiresIn: "1h",
		});
	}

	protected async sendPasswordResetEmail(email: string, resetToken: string) {
		const transporter = nodemailer.createTransport({
			service: "gmail",
			auth: {
				user: process.env.EMAIL_USER,
				pass: process.env.EMAIL_PASS,
			},
		});

		await transporter.sendMail({
			from: process.env.EMAIL_USER,
			to: email,
			subject: "Password reset request",
			text: `Click on the link to reset your password: ${process.env.CLIENT_URL}/reset-password/${resetToken}`,
		});
	}

	protected async getUserByResetToken(resetToken: string) {
		const decoded = jwt.verify(resetToken, process.env.JWT_SECRET) as JwtPayload;
		if (!decoded) {
			throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage("Invalid token"));
		}

		const user = await User.findById(decoded.userId);
		this.validateUserExists(user);
		return user;
	}

	protected async updateUserPassword(user: IUser, newPassword: string) {
		const hashedPassword = await bcrypt.hash(newPassword, 10);
		user.password = hashedPassword;
		await user.save();
	}

	protected validateUserExists(user: IUser | null) {
		if (!user) {
			throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage("User not found"));
		}
	}
}

class UserService extends BaseService {
	async registerUser(
		userData: Pick<IUser, "username" | "email" | "password">,
		res: Response
	) {
		await this.validateUserNotExists(userData.email);
		const user = await User.create(userData);
		generateTokenAndSetCookie(res, user._id);
		return this.getUserResponse(user);
	}

	async loginUser(email: string, password: string, res: Response) {
		const user = await this.getUserByEmail(email);
		this.validateUserCredentials(user, password);
		generateTokenAndSetCookie(res, user._id);
		return this.getUserResponse(user);
	}

	async forgotPassword(email: string) {
		const user = await this.getUserByEmail(email);
		const resetToken = await this.generateResetToken(user);
		await this.sendPasswordResetEmail(user.email, resetToken);
		return { message: "Email sent with password reset instructions" };
	}

	async resetPassword(resetToken: string, newPassword: string) {
		const user = await this.getUserByResetToken(resetToken);
		await this.updateUserPassword(user, newPassword);
		return { message: "Password reset successful" };
	}

	async logoutUser(res: Response) {
		res.clearCookie("jwt");
		return { message: "User logged out successfully" };
	}

	async findAllUsers() {
		const users = await User.find({});
		return users.map(this.getUserResponse);
	}

	async findUserById(userId: string) {
		return User.findById(userId);
	}

	async updateUserById(userId: string, updateData: Partial<IUser>) {
		const user = await this.findUserById(userId);
		this.updateUserFields(user, updateData);
		return user.save();
	}

	async deleteUserById(userId: string) {
		await User.findByIdAndDelete(userId);
		return { message: "User deleted successfully" };
	}

	private getUserResponse(user: IUser) {
		const { _id, username, email, role, photo } = user;
		return { _id, username, email, role, photo };
	}

	private updateUserFields(user: IUser, updateData: Partial<IUser>) {
		const { password, username, email, photo, role } = updateData;
		if (password) {
			user.password = password;
		}
		user.username = username ?? user.username;
		user.email = email ?? user.email;
		user.photo = photo ?? user.photo;
		user.role = role ?? user.role;
	}
}

export default new UserService();
