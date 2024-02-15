import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { IUser } from "../types/modalTypes";
import User from "../models/User";

/**
 * @description Protect routes
 * @name protect
 */

export const protect = async (req: Request, res: Response, next: NextFunction) => {
	try {
		let token: string;

		if(req.cookies.jwt) {
			token = req.cookies.jwt;
		}

		if(!token) {
			return res.status(401).json({
				message: "Not authorized to access this route",
				success: false,
			});
		
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
		const currentUsers = await User.findById(decoded.userId).select("-password");

		if(!currentUsers) {
			return res.status(401).json({
				message: "User not found",
				success: false,
			});
		}
	} catch (error) {
		
	}
};

/**
 * @name admin
 * @description Grant access to admin
 */

export const admin = async (req: Request, res: Response, next: NextFunction) => {
	if (req.user?.isAdmin) {
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
	if (req.user?.isProfessional) {
		next();
	} else {
		res.status(403).json({
			message: "Forbidden",
			success: false,
			error: "You are not a professional",
		});
	}
};
