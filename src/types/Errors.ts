export enum HttpStatusCode {
    OK = 200,
    CREATED = 201,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    CONFLICT = 409,
    INTERNAL_SERVER_ERROR = 500,
}

export class HttpError extends Error {
    statusCode: HttpStatusCode;
    errors: { message: string }[];

    constructor(statusCode: HttpStatusCode, message: string) {
        super(message);
        this.statusCode = statusCode;
        this.errors = [{ message }];
        Object.setPrototypeOf(this, new.target.prototype);
    }

    serializeErrors() {
        return this.errors;
    }
}

export class TokenGenerationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TokenGenerationError';
    }
}

export class UserIdRequiredError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UserIdRequiredError';
    }
}

export class DataBaseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DataBaseError';
    }
}
