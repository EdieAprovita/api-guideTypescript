import { OpenAPIV3 } from 'openapi-types';

const createStandardResponses = (successSchema?: string) => ({
    '200': {
        description: 'Operation successful',
        content: {
            'application/json': {
                schema: successSchema ? { $ref: `#/components/schemas/${successSchema}` } : { $ref: '#/components/schemas/SuccessResponse' },
            },
        },
    },
    '400': {
        description: 'Invalid request',
        content: {
            'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
        },
    },
    '404': {
        description: 'Resource not found',
        content: {
            'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
        },
    },
    '500': {
        description: 'Internal server error',
        content: {
            'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
        },
    },
});

const createGetAllEndpoint = (tag: string, schema: string) => ({
    get: {
        tags: [tag],
        summary: `Get all ${tag.toLowerCase()}`,
        responses: {
            '200': {
                description: `${tag} retrieved successfully`,
                content: {
                    'application/json': {
                        schema: {
                            type: 'array',
                            items: { $ref: `#/components/schemas/${schema}` },
                        },
                    },
                },
            },
        },
    },
});

const createPostEndpoint = (tag: string, schema: string) => ({
    post: {
        tags: [tag],
        summary: `Create ${tag.toLowerCase().slice(0, -1)}`,
        security: [{ bearerAuth: [] }],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: { $ref: `#/components/schemas/${schema}` },
                },
            },
        },
        responses: {
            '201': {
                description: `${tag.slice(0, -1)} created successfully`,
                content: {
                    'application/json': {
                        schema: { $ref: `#/components/schemas/${schema}` },
                    },
                },
            },
            '400': createStandardResponses()['400'],
        },
    },
});

const createGetByIdEndpoint = (tag: string, schema: string) => ({
    get: {
        tags: [tag],
        summary: `Get ${tag.toLowerCase().slice(0, -1)} by ID`,
        parameters: [{ $ref: '#/components/parameters/IdParameter' }],
        responses: createStandardResponses(schema),
    },
});

const createPutEndpoint = (tag: string, schema: string) => ({
    put: {
        tags: [tag],
        summary: `Update ${tag.toLowerCase().slice(0, -1)}`,
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParameter' }],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: { $ref: `#/components/schemas/${schema}` },
                },
            },
        },
        responses: createStandardResponses(schema),
    },
});

const createDeleteEndpoint = (tag: string) => ({
    delete: {
        tags: [tag],
        summary: `Delete ${tag.toLowerCase().slice(0, -1)}`,
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParameter' }],
        responses: createStandardResponses(),
    },
});

const createAddReviewEndpoint = (tag: string) => ({
    post: {
        tags: [tag],
        summary: `Add review to ${tag.toLowerCase().slice(0, -1)}`,
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdParameter' }],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: { $ref: '#/components/schemas/Review' },
                },
            },
        },
        responses: {
            '201': {
                description: 'Review added successfully',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/Review' },
                    },
                },
            },
            '401': {
                description: 'Unauthorized',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ErrorResponse' },
                        example: { success: false, message: 'Authentication required', error: 'Unauthorized' },
                    },
                },
            },
            '409': {
                description: 'Conflict',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ErrorResponse' },
                        example: { success: false, message: `User has already reviewed this ${tag.toLowerCase().slice(0, -1)}`, error: 'Conflict' },
                    },
                },
            },
        },
    },
});

const createPaginationParameters = () => [
    { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 }, example: 1 },
    { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 }, example: 10 },
    { name: 'rating', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 5 }, example: 5 },
    { name: 'sort', in: 'query', schema: { type: 'string' }, example: '-createdAt' },
];

const createReviewListResponse = (entityType: string) => ({
    '200': {
        description: 'Reviews fetched successfully',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'array', items: { $ref: '#/components/schemas/Review' } },
                        pagination: {
                            type: 'object',
                            properties: {
                                currentPage: { type: 'integer' },
                                totalPages: { type: 'integer' },
                                totalItems: { type: 'integer' },
                                itemsPerPage: { type: 'integer' },
                                hasNext: { type: 'boolean' },
                                hasPrevious: { type: 'boolean' },
                            },
                        },
                    },
                },
            },
        },
    },
    '400': {
        description: 'Invalid request',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' }, example: { success: false, message: 'Invalid ID format', error: 'BadRequest' } } },
    },
    '404': {
        description: `${entityType} not found`,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' }, example: { success: false, message: `${entityType} not found`, error: 'NotFound' } } },
    },
});

const createReviewStatsResponse = (entityType: string) => ({
    '200': {
        description: 'Review stats fetched successfully',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                totalReviews: { type: 'integer' },
                                averageRating: { type: 'number' },
                                ratingDistribution: {
                                    type: 'object',
                                    properties: {
                                        '1': { type: 'integer' },
                                        '2': { type: 'integer' },
                                        '3': { type: 'integer' },
                                        '4': { type: 'integer' },
                                        '5': { type: 'integer' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    '400': {
        description: 'Invalid request',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' }, example: { success: false, message: 'Invalid ID format', error: 'BadRequest' } } },
    },
    '404': {
        description: `${entityType} not found`,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' }, example: { success: false, message: `${entityType} not found`, error: 'NotFound' } } },
    },
});

const createReviewEndpoints = (tag: string, paramName = 'id') => ({
    [`/${tag.toLowerCase()}/{${paramName}}/reviews`]: {
        get: {
            tags: [tag],
            summary: `Get reviews for a ${tag.toLowerCase().slice(0, -1)}`,
            parameters: [
                { name: paramName, in: 'path', required: true, schema: { type: 'string' }, description: `${tag.slice(0, -1)} ID` },
                ...createPaginationParameters(),
            ],
            responses: createReviewListResponse(tag.slice(0, -1)),
        },
    },
    [`/${tag.toLowerCase()}/{${paramName}}/reviews/stats`]: {
        get: {
            tags: [tag],
            summary: `Get review statistics for a ${tag.toLowerCase().slice(0, -1)}`,
            parameters: [
                { name: paramName, in: 'path', required: true, schema: { type: 'string' }, description: `${tag.slice(0, -1)} ID` },
            ],
            responses: createReviewStatsResponse(tag.slice(0, -1)),
        },
    },
});

const createReviewPostEndpoint = (tag: string, paramName = 'id') => ({
    [`/${tag.toLowerCase()}/{${paramName}}/reviews`]: {
        post: {
            tags: [tag],
            summary: `Create review for a ${tag.toLowerCase().slice(0, -1)}`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: paramName, in: 'path', required: true, schema: { type: 'string' }, description: `${tag.slice(0, -1)} ID` },
            ],
            requestBody: {
                required: true,
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Review' } } },
            },
            responses: {
                '201': {
                    description: 'Review created successfully',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Review' },
                        },
                    },
                },
                '401': {
                    description: 'Unauthorized',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            example: { success: false, message: 'Authentication required', error: 'Unauthorized' },
                        },
                    },
                },
                '400': {
                    description: 'Invalid request',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' }, example: { success: false, message: 'Invalid ID format', error: 'BadRequest' } } },
                },
                '404': {
                    description: `${tag.slice(0, -1)} not found`,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' }, example: { success: false, message: `${tag.slice(0, -1)} not found`, error: 'NotFound' } } },
                },
            },
        },
    },
});

const createCrudEndpoints = (tag: string, schema: string) => ({
    [`/${tag.toLowerCase()}`]: {
        ...createGetAllEndpoint(tag, schema),
        ...createPostEndpoint(tag, schema),
    },
    [`/${tag.toLowerCase()}/{id}`]: {
        ...createGetByIdEndpoint(tag, schema),
        ...createPutEndpoint(tag, schema),
        ...createDeleteEndpoint(tag),
    },
    [`/${tag.toLowerCase()}/add-review/{id}`]: createAddReviewEndpoint(tag),
});

const swaggerDocument: OpenAPIV3.Document = {
    openapi: '3.0.0',
    info: {
        title: 'API Guide TypeScript',
        description: 'Complete API collection for the Express TypeScript API with proper authentication and all endpoints',
        version: '1.0.0',
        contact: {
            name: 'API Support',
            email: 'support@apiguide.com',
        },
    },
    servers: [
        { url: 'http://localhost:5001/api/v1', description: 'Development server' },
        { url: 'https://api.apiguide.com/api/v1', description: 'Production server' },
    ],
    security: [{ bearerAuth: [] }],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'JWT token for authentication',
            },
        },
        schemas: {
            // Common Types
            GeoJSONPoint: {
                type: 'object',
                properties: {
                    type: {
                        type: 'string',
                        enum: ['Point'],
                        example: 'Point',
                    },
                    coordinates: {
                        type: 'array',
                        items: { type: 'number' },
                        minItems: 2,
                        maxItems: 2,
                        example: [40.7128, -74.006],
                    },
                },
            },
            Contact: {
                type: 'object',
                properties: {
                    phone: { type: 'string', example: '+1234567890' },
                    email: { type: 'string', format: 'email', example: 'contact@example.com' },
                    facebook: { type: 'string', example: 'facebook.com/example' },
                    instagram: { type: 'string', example: 'instagram.com/example' },
                },
            },
            BusinessHours: {
                type: 'object',
                properties: {
                    dayOfWeek: { type: 'string', example: 'Monday' },
                    openTime: { type: 'string', example: '09:00' },
                    closeTime: { type: 'string', example: '17:00' },
                },
            },
            Animal: {
                type: 'object',
                properties: {
                    animalName: { type: 'string', example: 'Leo' },
                    specie: { type: 'string', example: 'Lion' },
                    age: { type: 'number', example: 5 },
                    gender: { type: 'string', enum: ['male', 'female'], example: 'male' },
                    habitat: { type: 'string', example: 'Savanna' },
                    diet: { type: 'array', items: { type: 'string' }, example: ['meat', 'bones'] },
                    image: { type: 'string', format: 'uri', example: 'https://example.com/animal.jpg' },
                    vaccines: { type: 'array', items: { type: 'string' }, example: ['Rabies', 'Distemper'] },
                    lastVaccine: { type: 'string', format: 'date', example: '2024-01-15' },
                },
            },
            Experience: {
                type: 'object',
                properties: {
                    title: { type: 'string', example: 'Software Developer' },
                    company: { type: 'string', example: 'Tech Corp' },
                    location: { type: 'string', example: 'New York, NY' },
                    from: { type: 'string', format: 'date', example: '2020-01-01' },
                    to: { type: 'string', format: 'date', example: '2023-12-31' },
                    current: { type: 'boolean', example: false },
                    description: { type: 'string', example: 'Developed web applications using React and Node.js' },
                },
            },
            Education: {
                type: 'object',
                properties: {
                    school: { type: 'string', example: 'University of Technology' },
                    degree: { type: 'string', example: 'Bachelor of Science' },
                    fieldOfStudy: { type: 'string', example: 'Computer Science' },
                    from: { type: 'string', format: 'date', example: '2016-09-01' },
                    to: { type: 'string', format: 'date', example: '2020-05-15' },
                    current: { type: 'boolean', example: false },
                    description: { type: 'string', example: 'Focused on software engineering and web development' },
                },
            },
            Social: {
                type: 'object',
                properties: {
                    youtube: { type: 'string', example: 'youtube.com/@example' },
                    facebook: { type: 'string', example: 'facebook.com/example' },
                    twitter: { type: 'string', example: 'twitter.com/example' },
                    instagram: { type: 'string', example: 'instagram.com/example' },
                    linkedin: { type: 'string', example: 'linkedin.com/in/example' },
                },
            },
            Skill: {
                type: 'object',
                properties: {
                    skill: { type: 'string', example: 'JavaScript' },
                    company: { type: 'string', example: 'Tech Corp' },
                    location: { type: 'string', example: 'New York, NY' },
                    from: { type: 'string', format: 'date', example: '2020-01-01' },
                    to: { type: 'string', format: 'date', example: '2023-12-31' },
                    current: { type: 'boolean', example: false },
                    description: { type: 'string', example: 'Advanced JavaScript development' },
                },
            },
            Like: {
                type: 'object',
                properties: {
                    username: { type: 'string', example: '60c72b2f9b1d8b0015b3c123' },
                },
            },
            Comment: {
                type: 'object',
                properties: {
                    id: { type: 'string', example: 'comment123' },
                    username: { type: 'string', example: '60c72b2f9b1d8b0015b3c123' },
                    text: { type: 'string', example: 'Great post!' },
                    name: { type: 'string', example: 'John Doe' },
                    avatar: { type: 'string', format: 'uri', example: 'https://example.com/avatar.jpg' },
                    date: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
                },
            },
            // Main Models
            User: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '60c72b2f9b1d8b0015b3c123' },
                    username: { type: 'string', example: 'testuser' },
                    email: { type: 'string', format: 'email', example: 'test@example.com' },
                    role: { type: 'string', enum: ['user', 'professional', 'admin'], default: 'user' },
                    isAdmin: { type: 'boolean', example: false },
                    isActive: { type: 'boolean', example: true },
                    isDeleted: { type: 'boolean', example: false },
                    photo: { type: 'string', format: 'uri', example: 'https://example.com/photo.jpg' },
                    firstName: { type: 'string', example: 'John' },
                    lastName: { type: 'string', example: 'Doe' },
                    timestamps: {
                        type: 'object',
                        properties: {
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                },
            },
            Business: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '60c72b2f9b1d8b0015b3c124' },
                    namePlace: { type: 'string', example: 'Tech Solutions Inc' },
                    author: { type: 'string', example: '60c72b2f9b1d8b0015b3c123' },
                    address: { type: 'string', example: '123 Business St, New York, NY' },
                    location: { $ref: '#/components/schemas/GeoJSONPoint' },
                    image: { type: 'string', format: 'uri', example: 'https://example.com/business.jpg' },
                    contact: { type: 'array', items: { $ref: '#/components/schemas/Contact' } },
                    budget: { type: 'number', example: 50000 },
                    typeBusiness: { type: 'string', example: 'technology' },
                    hours: { type: 'array', items: { $ref: '#/components/schemas/BusinessHours' } },
                    reviews: { type: 'array', items: { type: 'string' }, example: ['60c72b2f9b1d8b0015b3c125'] },
                    rating: { type: 'number', minimum: 0, maximum: 5, example: 4.5 },
                    numReviews: { type: 'number', example: 25 },
                    timestamps: {
                        type: 'object',
                        properties: {
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                },
            },
            Restaurant: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '60c72b2f9b1d8b0015b3c126' },
                    restaurantName: { type: 'string', example: 'El Buen Sabor' },
                    author: { type: 'string', example: '60c72b2f9b1d8b0015b3c123' },
                    typePlace: { type: 'string', example: 'restaurant' },
                    address: { type: 'string', example: '123 Main St, New York, NY' },
                    location: { $ref: '#/components/schemas/GeoJSONPoint' },
                    image: { type: 'string', format: 'uri', example: 'https://example.com/restaurant.jpg' },
                    budget: { type: 'string', enum: ['low', 'medium', 'high'], example: 'medium' },
                    contact: { type: 'array', items: { $ref: '#/components/schemas/Contact' } },
                    cuisine: { type: 'array', items: { type: 'string' }, example: ['Mexican', 'Latin American'] },
                    reviews: { type: 'array', items: { type: 'string' }, example: ['60c72b2f9b1d8b0015b3c125'] },
                    rating: { type: 'number', minimum: 0, maximum: 5, example: 4.5 },
                    numReviews: { type: 'number', example: 25 },
                    timestamps: {
                        type: 'object',
                        properties: {
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                },
            },
            Doctor: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '60c72b2f9b1d8b0015b3c127' },
                    doctorName: { type: 'string', example: 'Dr. Smith' },
                    author: { type: 'string', example: '60c72b2f9b1d8b0015b3c123' },
                    address: { type: 'string', example: '456 Medical St, New York, NY' },
                    location: { $ref: '#/components/schemas/GeoJSONPoint' },
                    image: { type: 'string', format: 'uri', example: 'https://example.com/doctor.jpg' },
                    specialty: { type: 'string', example: 'Cardiology' },
                    contact: { type: 'array', items: { $ref: '#/components/schemas/Contact' } },
                    reviews: { type: 'array', items: { type: 'string' }, example: ['60c72b2f9b1d8b0015b3c125'] },
                    rating: { type: 'number', minimum: 0, maximum: 5, example: 4.5 },
                    numReviews: { type: 'number', example: 25 },
                    timestamps: {
                        type: 'object',
                        properties: {
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                },
            },
            Market: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '60c72b2f9b1d8b0015b3c128' },
                    marketName: { type: 'string', example: 'Central Market' },
                    author: { type: 'string', example: '60c72b2f9b1d8b0015b3c123' },
                    address: { type: 'string', example: '789 Market St, New York, NY' },
                    location: { $ref: '#/components/schemas/GeoJSONPoint' },
                    image: { type: 'string', format: 'uri', example: 'https://example.com/market.jpg' },
                    typeMarket: { type: 'string', enum: ['supermarket', 'convenience store', 'grocery store'], example: 'supermarket' },
                    reviews: { type: 'array', items: { type: 'string' }, example: ['60c72b2f9b1d8b0015b3c125'] },
                    rating: { type: 'number', minimum: 0, maximum: 5, example: 4.5 },
                    numReviews: { type: 'number', example: 25 },
                    timestamps: {
                        type: 'object',
                        properties: {
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                },
            },
            Recipe: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '60c72b2f9b1d8b0015b3c129' },
                    title: { type: 'string', example: 'Delicious Tacos' },
                    author: { type: 'string', example: '60c72b2f9b1d8b0015b3c123' },
                    description: { type: 'string', example: 'Authentic Mexican tacos recipe' },
                    instructions: { type: 'string', example: '1. Prepare the meat... 2. Cook the tortillas...' },
                    ingredients: { type: 'array', items: { type: 'string' }, example: ['tortillas', 'beef', 'onions', 'cilantro'] },
                    typeDish: { type: 'string', example: 'main course' },
                    image: { type: 'string', format: 'uri', example: 'https://example.com/recipe.jpg' },
                    cookingTime: { type: 'number', example: 30 },
                    difficulty: { type: 'string', example: 'medium' },
                    budget: { type: 'string', example: 'low' },
                    reviews: { type: 'array', items: { type: 'string' }, example: ['60c72b2f9b1d8b0015b3c125'] },
                    rating: { type: 'number', minimum: 0, maximum: 5, example: 4.5 },
                    numReviews: { type: 'number', example: 25 },
                    timestamps: {
                        type: 'object',
                        properties: {
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                },
            },
            Post: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '60c72b2f9b1d8b0015b3c130' },
                    username: { type: 'string', example: '60c72b2f9b1d8b0015b3c123' },
                    text: { type: 'string', example: 'This is my post content' },
                    name: { type: 'string', example: 'John Doe' },
                    avatar: { type: 'string', format: 'uri', example: 'https://example.com/avatar.jpg' },
                    likes: { type: 'array', items: { $ref: '#/components/schemas/Like' } },
                    comments: { type: 'array', items: { $ref: '#/components/schemas/Comment' } },
                    date: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
                    timestamps: {
                        type: 'object',
                        properties: {
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                },
            },
            Sanctuary: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '60c72b2f9b1d8b0015b3c131' },
                    sanctuaryName: { type: 'string', example: 'Wildlife Sanctuary' },
                    author: { type: 'string', example: '60c72b2f9b1d8b0015b3c123' },
                    address: { type: 'string', example: '321 Nature St, New York, NY' },
                    location: { $ref: '#/components/schemas/GeoJSONPoint' },
                    image: { type: 'string', format: 'uri', example: 'https://example.com/sanctuary.jpg' },
                    typeofSanctuary: { type: 'string', example: 'wildlife' },
                    animals: { type: 'array', items: { $ref: '#/components/schemas/Animal' } },
                    capacity: { type: 'number', example: 100 },
                    caretakers: { type: 'array', items: { type: 'string' }, example: ['John Smith', 'Jane Doe'] },
                    contact: { type: 'array', items: { $ref: '#/components/schemas/Contact' } },
                    reviews: { type: 'array', items: { type: 'string' }, example: ['60c72b2f9b1d8b0015b3c125'] },
                    rating: { type: 'number', minimum: 0, maximum: 5, example: 4.5 },
                    numReviews: { type: 'number', example: 25 },
                    timestamps: {
                        type: 'object',
                        properties: {
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                },
            },
            Profession: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '60c72b2f9b1d8b0015b3c132' },
                    professionName: { type: 'string', example: 'Software Developer' },
                    author: { type: 'string', example: '60c72b2f9b1d8b0015b3c123' },
                    address: { type: 'string', example: '654 Professional St, New York, NY' },
                    location: { $ref: '#/components/schemas/GeoJSONPoint' },
                    specialty: { type: 'string', example: 'Web Development' },
                    contact: { type: 'array', items: { $ref: '#/components/schemas/Contact' } },
                    reviews: { type: 'array', items: { type: 'string' }, example: ['60c72b2f9b1d8b0015b3c125'] },
                    rating: { type: 'number', minimum: 0, maximum: 5, example: 4.5 },
                    numReviews: { type: 'number', example: 25 },
                    timestamps: {
                        type: 'object',
                        properties: {
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                },
            },
            ProfessionalProfile: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '60c72b2f9b1d8b0015b3c133' },
                    user: { type: 'string', example: '60c72b2f9b1d8b0015b3c123' },
                    contact: { type: 'array', items: { $ref: '#/components/schemas/Contact' } },
                    skills: { type: 'array', items: { $ref: '#/components/schemas/Skill' } },
                    experience: { type: 'array', items: { $ref: '#/components/schemas/Experience' } },
                    education: { type: 'array', items: { $ref: '#/components/schemas/Education' } },
                    social: { type: 'array', items: { $ref: '#/components/schemas/Social' } },
                    date: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
                    reviews: { type: 'array', items: { type: 'string' }, example: ['60c72b2f9b1d8b0015b3c125'] },
                    rating: { type: 'number', minimum: 0, maximum: 5, example: 4.5 },
                    numReviews: { type: 'number', example: 25 },
                    timestamps: {
                        type: 'object',
                        properties: {
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                },
            },
            Review: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '60c72b2f9b1d8b0015b3c125' },
                    entityType: {
                        type: 'string',
                        description: 'Polymorphic target type for this review',
                        enum: ['Restaurant', 'Recipe', 'Market', 'Business', 'Doctor'],
                        example: 'Restaurant',
                    },
                    entity: {
                        type: 'string',
                        description: 'ObjectId of the reviewed entity, paired with entityType',
                        example: '60c72b2f9b1d8b0015b3c126',
                    },
                    rating: { type: 'number', minimum: 1, maximum: 5, example: 5 },
                    title: { type: 'string', minLength: 5, maxLength: 100, example: 'Excelente comida' },
                    content: { type: 'string', minLength: 10, maxLength: 1000, example: 'La mejor comida mexicana que he probado' },
                    visitDate: { type: 'string', format: 'date', example: '2024-01-15' },
                    recommendedDishes: { type: 'array', items: { type: 'string', maxLength: 50 }, example: ['Tacos al pastor', 'Guacamole'] },
                    tags: { type: 'array', items: { type: 'string', maxLength: 30 }, example: ['auténtico', 'familiar'] },
                    author: { type: 'string', example: '60c72b2f9b1d8b0015b3c123' },
                    restaurant: {
                        type: 'string',
                        description: 'DEPRECATED - use entityType + entity instead',
                        example: '60c72b2f9b1d8b0015b3c126',
                        deprecated: true,
                    },
                    helpfulCount: { type: 'number', example: 10 },
                    helpfulVotes: { type: 'array', items: { type: 'string' }, example: ['60c72b2f9b1d8b0015b3c123'] },
                    timestamps: {
                        type: 'object',
                        properties: {
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                },
            },
            // Request/Response schemas
            RegisterRequest: {
                type: 'object',
                required: ['username', 'email', 'password'],
                properties: {
                    username: { type: 'string', example: 'testUser' },
                    email: { type: 'string', format: 'email', example: 'test@example.com' },
                    password: { type: 'string', example: 'SecurePassword123!' },
                    role: { type: 'string', enum: ['user', 'professional', 'admin'], default: 'user' },
                },
            },
            LoginRequest: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: { type: 'string', format: 'email', example: 'test@example.com' },
                    password: { type: 'string', example: 'SecurePassword123!' },
                },
            },
            ErrorResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Error message' },
                    error: { type: 'string', example: 'ValidationError' },
                },
            },
            SuccessResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Operation successful' },
                },
            },
        },
        parameters: {
            IdParameter: {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' },
                description: 'Resource ID',
            },
        },
    },
    tags: [
        { name: 'Authentication' },
        { name: 'Users' },
        { name: 'Businesses' },
        { name: 'Restaurants' },
        { name: 'Doctors' },
        { name: 'Markets' },
        { name: 'Recipes' },
        { name: 'Posts' },
        { name: 'Sanctuaries' },
        { name: 'Professions' },
        { name: 'Professional Profiles' },
        { name: 'Reviews' },
        { name: 'Cache Management' },
    ],
    paths: {
        // Authentication endpoints
        '/users/register': {
            post: {
                tags: ['Authentication'],
                summary: 'Register a new user',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/RegisterRequest' },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'User registered successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/User' },
                            },
                        },
                    },
                    ...createStandardResponses(),
                },
            },
        },
        '/users/login': {
            post: {
                tags: ['Authentication'],
                summary: 'Authenticate user and obtain token',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/LoginRequest' },
                        },
                    },
                },
                responses: createStandardResponses('User'),
            },
        },
        '/users/forgot-password': {
            post: {
                tags: ['Authentication'],
                summary: 'Request password reset',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email'],
                                properties: {
                                    email: { type: 'string', format: 'email', example: 'john@example.com' },
                                },
                            },
                        },
                    },
                },
                responses: createStandardResponses(),
            },
        },
        '/users/reset-password': {
            put: {
                tags: ['Authentication'],
                summary: 'Reset password with token',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['token', 'newPassword'],
                                properties: {
                                    token: { type: 'string', example: 'reset-token-here' },
                                    newPassword: { type: 'string', example: 'newpassword123' },
                                },
                            },
                        },
                    },
                },
                responses: createStandardResponses(),
            },
        },
        '/users/logout': {
            post: {
                tags: ['Authentication'],
                summary: 'Logout user',
                security: [{ bearerAuth: [] }],
                responses: createStandardResponses(),
            },
        },
        
        // User management endpoints
        '/users': {
            get: {
                tags: ['Users'],
                summary: 'Get all users',
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'Users retrieved successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/User' },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/users/{id}': {
            ...createGetByIdEndpoint('Users', 'User'),
            ...createDeleteEndpoint('Users'),
        },
        '/users/profile/{id}': {
            put: {
                tags: ['Users'],
                summary: 'Update user profile',
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/IdParameter' }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    username: { type: 'string', example: 'Updated Name' },
                                    email: { type: 'string', format: 'email', example: 'updated@example.com' },
                                    firstName: { type: 'string', example: 'John' },
                                    lastName: { type: 'string', example: 'Doe' },
                                    photo: { type: 'string', example: 'profile.jpg' },
                                },
                            },
                        },
                    },
                },
                responses: createStandardResponses('User'),
            },
        },

        // CRUD endpoints generated by helpers
        ...createCrudEndpoints('Businesses', 'Business'),
        ...createCrudEndpoints('Restaurants', 'Restaurant'),
        ...createCrudEndpoints('Doctors', 'Doctor'),
        ...createCrudEndpoints('Markets', 'Market'),
        ...createCrudEndpoints('Recipes', 'Recipe'),
        ...createCrudEndpoints('Posts', 'Post'),
        ...createCrudEndpoints('Sanctuaries', 'Sanctuary'),
        ...createCrudEndpoints('Professions', 'Profession'),
        ...createCrudEndpoints('Professional Profiles', 'ProfessionalProfile'),

        // Special endpoints that don't follow CRUD pattern
        '/restaurants/top-rated': {
            get: {
                tags: ['Restaurants'],
                summary: 'Get top rated restaurants',
                responses: {
                    '200': {
                        description: 'Top rated restaurants retrieved successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/Restaurant' },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/posts/like/{id}': {
            post: {
                tags: ['Posts'],
                summary: 'Like a post',
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/IdParameter' }],
                responses: createStandardResponses('Post'),
            },
        },
        '/posts/unlike/{id}': {
            post: {
                tags: ['Posts'],
                summary: 'Unlike a post',
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/IdParameter' }],
                responses: createStandardResponses('Post'),
            },
        },
        '/posts/comment/{id}': {
            post: {
                tags: ['Posts'],
                summary: 'Add comment to post',
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/IdParameter' }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Comment' },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'Comment added successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Post' },
                            },
                        },
                    },
                },
            },
        },
        '/reviews/{id}': {
            get: {
                tags: ['Reviews'],
                summary: 'Get review by ID',
                parameters: [{ $ref: '#/components/parameters/IdParameter' }],
                responses: createStandardResponses('Review'),
            },
            put: {
                tags: ['Reviews'],
                summary: 'Update review',
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/IdParameter' }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Review' },
                        },
                    },
                },
                responses: {
                    ...createStandardResponses('Review'),
                    '401': {
                        description: 'Unauthorized',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                                example: { success: false, message: 'Authentication required', error: 'Unauthorized' },
                            },
                        },
                    },
                    '403': {
                        description: 'Forbidden',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                                example: { success: false, message: 'You can only modify your own reviews', error: 'Forbidden' },
                            },
                        },
                    },
                },
            },
            delete: {
                tags: ['Reviews'],
                summary: 'Delete review',
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/IdParameter' }],
                responses: {
                    ...createStandardResponses(),
                    '401': {
                        description: 'Unauthorized',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                                example: { success: false, message: 'Authentication required', error: 'Unauthorized' },
                            },
                        },
                    },
                    '403': {
                        description: 'Forbidden',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                                example: { success: false, message: 'You can only modify your own reviews', error: 'Forbidden' },
                            },
                        },
                    },
                },
            },
        },
        '/reviews/{id}/helpful': {
            post: {
                tags: ['Reviews'],
                summary: 'Mark review as helpful',
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/IdParameter' }],
                responses: {
                    ...createStandardResponses('Review'),
                    '401': {
                        description: 'Unauthorized',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                                example: { success: false, message: 'Authentication required', error: 'Unauthorized' },
                            },
                        },
                    },
                    '409': {
                        description: 'Conflict',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                                example: { success: false, message: 'User has already voted', error: 'Conflict' },
                            },
                        },
                    },
                },
            },
            delete: {
                tags: ['Reviews'],
                summary: 'Remove helpful vote',
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/IdParameter' }],
                responses: {
                    ...createStandardResponses('Review'),
                    '401': {
                        description: 'Unauthorized',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                                example: { success: false, message: 'Authentication required', error: 'Unauthorized' },
                            },
                        },
                    },
                },
            },
        },
        
        // Cache Management endpoints
        '/cache/stats': {
            get: {
                tags: ['Cache Management'],
                summary: 'Get cache statistics',
                responses: createStandardResponses(),
            },
        },
        '/cache/health': {
            get: {
                tags: ['Cache Management'],
                summary: 'Get cache health status',
                responses: createStandardResponses(),
            },
        },
        '/cache/warm': {
            post: {
                tags: ['Cache Management'],
                summary: 'Warm cache with data',
                requestBody: {
                    required: false,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    dataType: {
                                        type: 'string',
                                        enum: ['all', 'restaurants', 'businesses', 'users', 'categories', 'geo'],
                                        default: 'all',
                                        description: 'Type of data to warm',
                                    },
                                    autoStart: { type: 'boolean', default: true },
                                    intervalMinutes: { type: 'number', default: 30 },
                                },
                            },
                        },
                    },
                },
                responses: createStandardResponses(),
            },
        },
        '/cache/alerts': {
            get: {
                tags: ['Cache Management'],
                summary: 'Get cache alerts',
                responses: createStandardResponses(),
            },
        },
        '/cache/invalidate/{pattern}': {
            delete: {
                tags: ['Cache Management'],
                summary: 'Invalidate cache by pattern',
                parameters: [
                    {
                        name: 'pattern',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Cache pattern to invalidate',
                        example: 'restaurants:*',
                    },
                ],
                responses: createStandardResponses(),
            },
        },
        '/cache/flush': {
            delete: {
                tags: ['Cache Management'],
                summary: 'Flush all cache',
                responses: createStandardResponses(),
            },
        },

        // Review endpoints using helpers
        ...createReviewEndpoints('Markets'),
        ...createReviewEndpoints('Recipes'),

        // Restaurant review endpoints (uses 'restaurantId' instead of 'id')
        ...createReviewPostEndpoint('Restaurants', 'restaurantId'),
        ...createReviewEndpoints('Restaurants', 'restaurantId'),
    },
};

export default swaggerDocument;
