import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { IUser } from "../types/modalTypes";
import User from "../models/User";

/**
 * @description Protect routes
 * @name protect
 */

export const protect = async (req: Request, res: Response, next: NextFunction) => {
	let token: string;

	if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
		try {
			token = req.headers.authorization.split(" ")[1];

			const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as IUser;

			req.user = User.findById(decoded.id).select(
				"-password"
			) as unknown as Request["user"];

			next();
		} catch (error) {
			res.status(401).json({
				message: "Unauthorized",
				success: false,
				error: `${error}`,
			});
		}
	}
	token = req.body.token || req.query.token || req.headers["x-access-token"];
	if (!token) {
		res.status(401).json({
			message: "Unauthorized",
			success: false,
			error: "No token provided",
		});
	}
};
