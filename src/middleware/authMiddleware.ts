import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { NotFoundError, NotAuthorizedError } from "../types/Errors";
import User from "../models/User";
import professionalProfile from "../models/Profession";

/**
 * @description Protect routes
 * @name protect
 */

export const protect = async (req: Request, res: Response, next: NextFunction) => {
	try {
		let token: string;

		if (req.cookies.jwt) {
			token = req.cookies.jwt;
		}

		if (!token) {
			return next(new NotAuthorizedError("Not authorized"));
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
			userId: string;
		};
		const currentUsers = await User.findById(decoded.userId).select("-password");

		if (!currentUsers) {
			return next(new NotFoundError("User not found"));
		}

		req.user = currentUsers;
		next();
	} catch (error) {
		return next(error);
	}
};

/**
 * @name admin
 * @description Grant access to admin
 */

export const admin = async (req: Request, res: Response, next: NextFunction) => {
	if (req.user?.role === "admin") {
		next();
	} else {
		res.status(403).json({
			message: "Forbidden",
			success: false,
			error: "You are not an admin",
		});
	}
};

/**
 * @name professional
 * @description Protect routes with JWT for professional
 */

export const professional = async (req: Request, res: Response, next: NextFunction) => {
	if (req.user?.role === "professional") {
		next();
	} else {
		res.status(403).json({
			message: "Forbidden",
			success: false,
			error: "You are not a professional",
		});
	}
};

/**
 * @name isOwnerOrAdmin
 * @description Protect routes with JWT for user or admin
 */

export const isOwnerOrAdmin = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const profile = await professionalProfile.findById(req.params.id);
		if (!profile) {
			throw new NotFoundError("Profile not found");
		}
		if (profile.user.equals(req.user._id) || req.user.role === "admin") {
			next();
		} else {
			throw new NotAuthorizedError("Not authorized");
		}
	} catch (error) {
		next(error);
	}
};
