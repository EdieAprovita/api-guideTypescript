export class CustomError extends Error {
	statusCode: number;

	constructor(message: string, statusCode: number) {
		super(message);
		this.statusCode = statusCode;
		Object.setPrototypeOf(this, new.target.prototype);
	}

	serializeErrors() {
		return [{ message: this.message }];
	}
}

export class BadRequestError extends CustomError {
	statusCode: 400;
	constructor(message: string) {
		super(message, 400);
	}
}

export class NotFoundError extends CustomError {
	constructor(message: string = "Not Found") {
		super(message, 404);
	}
}

export class NotAuthorizedError extends CustomError {
	constructor(message: string = "Not authorized") {
		super(message, 401);
	}
}

export class InternalServerError extends CustomError {
	constructor(message: string = "Internal Server Error") {
		super(message, 500);
	}
}

export class DataNotFoundError extends CustomError {
	constructor(message: string = "Data not found") {
		super(message, 404);
	}
}
