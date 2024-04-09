import { Request, Response, NextFunction } from "express";

type AsyncMiddleware = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const asyncHandler = (fn: AsyncMiddleware): AsyncMiddleware => {
	return (req, res, next): Promise<void> => {
		return Promise.resolve(fn(req, res, next)).catch(next);
	};
};

export default asyncHandler;
