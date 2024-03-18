enum HttpStatusCode {
	BAD_REQUEST = 400,
	NOT_FOUND = 404,
	UNAUTHORIZED = 401,
	INTERNAL_SERVER_ERROR = 500,
}

export class CustomError extends Error {
	statusCode: number;

	constructor(
		message: string,
		statusCode: number = HttpStatusCode.INTERNAL_SERVER_ERROR
	) {
		super(message);
		this.statusCode = statusCode;
		Object.setPrototypeOf(this, new.target.prototype);
	}

	serializeErrors() {
		return [{ message: this.message }];
	}
}

export class BadRequestError extends CustomError {
	constructor(message: string = "Bad Request") {
		super(message, HttpStatusCode.BAD_REQUEST);
	}
}

export class NotFoundError extends CustomError {
	constructor(message: string = "Not Found") {
		super(message, HttpStatusCode.NOT_FOUND);
	}
}

export class NotAuthorizedError extends CustomError {
	constructor(message: string = "Not authorized") {
		super(message, HttpStatusCode.UNAUTHORIZED);
	}
}

export class InternalServerError extends CustomError {
	constructor(message: string = "Internal Server Error") {
		super(message, HttpStatusCode.INTERNAL_SERVER_ERROR);
	}
}

export class DataNotFoundError extends NotFoundError {
	constructor(message: string = "Data not found") {
		super(message);
	}
}
export class TokenGenerationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "TokenGenerationError";
	}
}

export class UserIdRequiredError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "UserIdRequiredError";
	}
}

export class DatabaseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "DatabaseError";
    }
}
