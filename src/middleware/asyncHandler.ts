import { Request, Response, NextFunction } from "express";

type AsyncFunction<T = Response> = (
	req: Request,
	res: Response,
	next: NextFunction
) => Promise<T>;

const asyncHandler =
	<T = Response>(fn: AsyncFunction<T>) =>
	(req: Request, res: Response, next: NextFunction): void => {
		Promise.resolve(fn(req, res, next)).catch(next);
	};

export default asyncHandler;
