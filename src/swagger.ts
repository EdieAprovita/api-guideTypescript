import { OpenAPIV3 } from "openapi-types";

const swaggerDocument: OpenAPIV3.Document = {
	openapi: "3.0.0",
	info: {
		title: "Vegan City Guide API",
		version: "1.0.0",
		description: "API documentation for the Vegan City Guide application",
	},
	servers: [{ url: "http://localhost:5000/api/v1", description: "Development server" }],
	components: {
		schemas: {
			RegisterRequest: {
				type: "object",
				required: ["username", "email", "password"],
				properties: {
					username: {
						type: "string",
						example: "testUser",
					},
					email: {
						type: "string",
						format: "email",
						example: "test@example.com",
					},
					password: {
						type: "string",
						example: "password123",
					},
				},
			},
                        LoginRequest: {
                                type: "object",
                                required: ["email", "password"],
                                properties: {
                                        email: {
                                                type: "string",
                                                format: "email",
                                                example: "test@example.com",
                                        },
                                        password: {
                                                type: "string",
                                                example: "password123",
                                        },
                                },
                        },
                        ErrorResponse: {
                                type: "object",
                                properties: {
                                        message: {
                                                type: "string",
                                                example: "Invalid data",
                                        },
                                },
                        },
                },
        },
	paths: {
		"/users/register": {
			post: {
				summary: "Register a new user",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								$ref: "#/components/schemas/RegisterRequest",
							},
						},
					},
				},
                                responses: {
                                        "201": { description: "User registered" },
                                        "400": {
                                                description: "Invalid request",
                                                content: {
                                                        "application/json": {
                                                                schema: {
                                                                        $ref: "#/components/schemas/ErrorResponse",
                                                                },
                                                        },
                                                },
                                        },
                                        "409": {
                                                description: "User already exists",
                                                content: {
                                                        "application/json": {
                                                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                                        },
                                                },
                                        },
                                },
			},
		},
		"/users/login": {
			post: {
				summary: "Authenticate user and obtain token",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								$ref: "#/components/schemas/LoginRequest",
							},
						},
					},
				},
                                responses: {
                                        "200": { description: "Successful login" },
                                        "400": {
                                                description: "Invalid request",
                                                content: {
                                                        "application/json": {
                                                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                                        },
                                                },
                                        },
                                        "401": {
                                                description: "Unauthorized",
                                                content: {
                                                        "application/json": {
                                                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                                        },
                                                },
                                        },
                                },
			},
		},
	},
};

export default swaggerDocument;
