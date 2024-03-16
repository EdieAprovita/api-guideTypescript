import { Response } from "express";
import jwt from "jsonwebtoken";

/**
 * @description Generate a new token for the user and set it as an HTTP-Only cookie
 * @param res - The Express response object
 * @param userId - The user ID for which to generate the token
 */
const generateTokenAndSetCookie = (res: Response, userId: string): void => {
	const token = jwt.sign({ userId }, process.env.JWT_SECRET as string, {
		expiresIn: "30d",
	});

	res.cookie("jwt", token, {
		httpOnly: true,
		secure: process.env.NODE_ENV !== "development",
		sameSite: "strict",
		maxAge: 30 * 24 * 60 * 60 * 1000,
	});
};

export default generateTokenAndSetCookie;
