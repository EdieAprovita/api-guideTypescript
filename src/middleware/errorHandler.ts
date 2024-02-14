import { Request, Response, NextFunction } from "express";
import { CustomError } from "../types/Errors";
import logger from "../utils/logger";

export const errorHandler = (
	err: Error,
	req: Request,
	res: Response,
	next: NextFunction
) => {
	logger.error(`[Error] ${req.method} ${req.path}`, {
		error: err.message,
		stack: err.stack,
		user: req.user ? req.user._id : "Guest",
	});

	if (err instanceof CustomError) {
		return res.status(err.statusCode).json({ errors: err.serializeErrors() });
	}

	const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
	res.status(statusCode).json({
		errors: [
			{
				message:
					process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
			},
		],
	});
};
