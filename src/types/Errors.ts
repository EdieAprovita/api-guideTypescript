export class CustomError extends Error {
	statusCode: number;

	constructor(message: string, statusCode: number) {
		super(message);
		this.statusCode = statusCode;
		Object.setPrototypeOf(this, CustomError.prototype);
	}

	serializeErrors() {
		return [{ message: this.message }];
	}
}

export class BadRequestError extends CustomError {
	statusCode: 400;
	constructor(message: string) {
		super(message, 400);
		Object.setPrototypeOf(this, BadRequestError.prototype);
	}

	serializeErrors() {
		return [{ message: this.message }];
	}
}

export class NotFoundError extends CustomError {
	statusCode = 404;

	constructor() {
		super("Route not found", 404);
		Object.setPrototypeOf(this, NotFoundError.prototype);
	}

	serializeErrors() {
		return [{ message: "Not Found" }];
	}
}

export class NotAuthorizedError extends CustomError {
	statusCode = 401;
	constructor() {
		super("Not authorized", 401);
		Object.setPrototypeOf(this, NotAuthorizedError.prototype);
	}

	serializeErrors() {
		return [{ message: this.message }];
	}
}

export class InternalServerError extends CustomError {
	statusCode = 500;

	constructor(public message: string = "Internal Server Error") {
		super(message, 500);
		Object.setPrototypeOf(this, InternalServerError.prototype);
	}

	serializeErrors() {
		return [{ message: this.message }];
	}
}

export class DataNotFoundError extends CustomError {
	statusCode = 404;

	constructor(public message: string = "Data not found") {
		super(message, 404);
		Object.setPrototypeOf(this, DataNotFoundError.prototype);
	}

	serializeErrors() {
		return [{ message: this.message }];
	}
}
