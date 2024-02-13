import { Request, Response, NextFunction } from "express";
import { CustomError } from "../types/Errors";

export const errorHandler = (
	err: Error,
	req: Request,
	res: Response,
	next: NextFunction
) => {
	if (err instanceof CustomError) {
		return res.status(err.statusCode).json({ errors: err.serializeErrors() });
	}

	console.error(err);

	res.status(500).json({
		errors: [{ message: "Something went wrong" }],
	});
};
