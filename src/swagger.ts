import { OpenAPIV3 } from 'openapi-types';

const createStandardResponses = (successSchema?: string) => ({
    '200': {
        description: 'Operation successful',
        content: {
            'application/json': {
                schema: successSchema
                    ? { $ref: `#/components/schemas/${successSchema}` }
                    : { $ref: '#/components/schemas/SuccessResponse' },
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
                        example: {
                            success: false,
                            message: `User has already reviewed this ${tag.toLowerCase().slice(0, -1)}`,
                            error: 'Conflict',
                        },
                    },
                },
            },
        },
    },
});

// Common properties with proper typing
const commonTimestamps = {
    type: 'object' as const,
    properties: {
        createdAt: { type: 'string' as const, format: 'date-time' as const },
        updatedAt: { type: 'string' as const, format: 'date-time' as const },
    },
};

const commonReviews = {
    type: 'array' as const,
    items: { type: 'string' as const },
    example: ['60c72b2f9b1d8b0015b3c125'],
};
const commonRating = { type: 'number' as const, minimum: 0, maximum: 5, example: 4.5 };
const commonNumReviews = { type: 'number' as const, example: 25 };
const commonAuthor = { type: 'string' as const, example: '60c72b2f9b1d8b0015b3c123' };
const commonLocation = { $ref: '#/components/schemas/GeoJSONPoint' as const };
const commonContact = { type: 'array' as const, items: { $ref: '#/components/schemas/Contact' as const } };

// Reusable property groups for reducing duplication
const reviewableEntityProperties = {
    reviews: commonReviews,
    rating: commonRating,
    numReviews: commonNumReviews,
    timestamps: commonTimestamps,
};

const baseLocationProperties = {
    author: commonAuthor,
    location: commonLocation,
    contact: commonContact,
};

// Error response factories
const createUnauthorizedResponse = (message = 'Authentication required') => ({
    description: 'Unauthorized',
    content: {
        'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { success: false, message, error: 'Unauthorized' },
        },
    },
});

const createBadRequestResponse = (message = 'Invalid ID format') => ({
    description: 'Invalid request',
    content: {
        'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { success: false, message, error: 'BadRequest' },
        },
    },
});

const createNotFoundResponse = (entityType: string) => ({
    description: `${entityType} not found`,
    content: {
        'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { success: false, message: `${entityType} not found`, error: 'NotFound' },
        },
    },
});

const createSuccessMessageResponse = (message: string) => ({
    description: message,
    content: {
        'application/json': {
            schema: {
                type: 'object' as const,
                properties: {
                    success: { type: 'boolean' as const, example: true },
                    message: { type: 'string' as const, example: message },
                },
            },
        },
    },
});

const createDataResponse = (schemaRef: string, description = 'Operation successful') => ({
    description,
    content: {
        'application/json': {
            schema: {
                type: 'object' as const,
                properties: {
                    success: { type: 'boolean' as const, example: true },
                    data: { $ref: `#/components/schemas/${schemaRef}` },
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
    '400': createBadRequestResponse(),
    '404': createNotFoundResponse(entityType),
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
    '400': createBadRequestResponse(),
    '404': createNotFoundResponse(entityType),
});

const createReviewCollectionEndpoints = (tag: string, paramName = 'id') => ({
    [`/${tag.toLowerCase()}/{${paramName}}/reviews`]: {
        get: {
            tags: [tag],
            summary: `Get reviews for a ${tag.toLowerCase().slice(0, -1)}`,
            parameters: [
                {
                    name: paramName,
                    in: 'path',
                    required: true,
                    schema: { type: 'string' },
                    description: `${tag.slice(0, -1)} ID`,
                },
                ...createPaginationParameters(),
            ],
            responses: createReviewListResponse(tag.slice(0, -1)),
        },
        post: {
            tags: [tag],
            summary: `Create review for a ${tag.toLowerCase().slice(0, -1)}`,
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: paramName,
                    in: 'path',
                    required: true,
                    schema: { type: 'string' },
                    description: `${tag.slice(0, -1)} ID`,
                },
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
                '401': createUnauthorizedResponse(),
                '400': createBadRequestResponse(),
                '404': createNotFoundResponse(tag.slice(0, -1)),
            },
        },
    },
    [`/${tag.toLowerCase()}/{${paramName}}/reviews/stats`]: {
        get: {
            tags: [tag],
            summary: `Get review statistics for a ${tag.toLowerCase().slice(0, -1)}`,
            parameters: [
                {
                    name: paramName,
                    in: 'path',
                    required: true,
                    schema: { type: 'string' },
                    description: `${tag.slice(0, -1)} ID`,
                },
            ],
            responses: createReviewStatsResponse(tag.slice(0, -1)),
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
        description:
            'Complete API collection for the Express TypeScript API with proper authentication and all endpoints',
        version: '1.0.0',
        contact: {
            name: 'API Support',
            email: 'support@apiguide.com',
        },
    },
    servers: [
        { url: 'http://localhost:5001/api/v1', description: 'Development server' },
        { url: 'https://api.apiguide.com/api/v1', description: 'Production server' },
        {
            url: 'https://api-guidetypescript-787324382752.europe-west1.run.app/api/v1',
            description: 'Cloud Run production server',
        },
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
            CacheStats: {
                type: 'object',
                properties: {
                    hitRatio: { type: 'number', example: 0.75 },
                    totalRequests: { type: 'number', example: 1000 },
                    cacheSize: { type: 'number', example: 500 },
                    memoryUsage: { type: 'string', example: '256MB' },
                    uptime: { type: 'number', example: 3600 },
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
                    ...baseLocationProperties,
                    address: { type: 'string', example: '123 Business St, New York, NY' },
                    image: { type: 'string', format: 'uri', example: 'https://example.com/business.jpg' },
                    budget: { type: 'number', example: 50000 },
                    typeBusiness: { type: 'string', example: 'technology' },
                    hours: { type: 'array', items: { $ref: '#/components/schemas/BusinessHours' } },
                    ...reviewableEntityProperties,
                },
            },
            Restaurant: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '60c72b2f9b1d8b0015b3c126' },
                    restaurantName: { type: 'string', example: 'El Buen Sabor' },
                    ...baseLocationProperties,
                    typePlace: { type: 'string', example: 'restaurant' },
                    address: { type: 'string', example: '123 Main St, New York, NY' },
                    image: { type: 'string', format: 'uri', example: 'https://example.com/restaurant.jpg' },
                    budget: { type: 'string', enum: ['low', 'medium', 'high'], example: 'medium' },
                    cuisine: { type: 'array', items: { type: 'string' }, example: ['Mexican', 'Latin American'] },
                    ...reviewableEntityProperties,
                },
            },
            Doctor: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '60c72b2f9b1d8b0015b3c127' },
                    doctorName: { type: 'string', example: 'Dr. Smith' },
                    ...baseLocationProperties,
                    address: { type: 'string', example: '456 Medical St, New York, NY' },
                    image: { type: 'string', format: 'uri', example: 'https://example.com/doctor.jpg' },
                    specialty: { type: 'string', example: 'Cardiology' },
                    ...reviewableEntityProperties,
                },
            },
            Market: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '60c72b2f9b1d8b0015b3c128' },
                    marketName: { type: 'string', example: 'Central Market' },
                    ...baseLocationProperties,
                    address: { type: 'string', example: '789 Market St, New York, NY' },
                    image: { type: 'string', format: 'uri', example: 'https://example.com/market.jpg' },
                    typeMarket: {
                        type: 'string',
                        enum: ['supermarket', 'convenience store', 'grocery store'],
                        example: 'supermarket',
                    },
                    ...reviewableEntityProperties,
                },
            },
            Recipe: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '60c72b2f9b1d8b0015b3c129' },
                    title: { type: 'string', example: 'Delicious Tacos' },
                    author: commonAuthor,
                    description: { type: 'string', example: 'Authentic Mexican tacos recipe' },
                    instructions: { type: 'string', example: '1. Prepare the meat... 2. Cook the tortillas...' },
                    ingredients: {
                        type: 'array',
                        items: { type: 'string' },
                        example: ['tortillas', 'beef', 'onions', 'cilantro'],
                    },
                    typeDish: { type: 'string', example: 'main course' },
                    image: { type: 'string', format: 'uri', example: 'https://example.com/recipe.jpg' },
                    cookingTime: { type: 'number', example: 30 },
                    difficulty: { type: 'string', example: 'medium' },
                    budget: { type: 'string', example: 'low' },
                    ...reviewableEntityProperties,
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
                    timestamps: commonTimestamps,
                },
            },
            Sanctuary: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '60c72b2f9b1d8b0015b3c131' },
                    sanctuaryName: { type: 'string', example: 'Wildlife Sanctuary' },
                    ...baseLocationProperties,
                    address: { type: 'string', example: '321 Nature St, New York, NY' },
                    image: { type: 'string', format: 'uri', example: 'https://example.com/sanctuary.jpg' },
                    typeofSanctuary: { type: 'string', example: 'wildlife' },
                    animals: { type: 'array', items: { $ref: '#/components/schemas/Animal' } },
                    capacity: { type: 'number', example: 100 },
                    caretakers: { type: 'array', items: { type: 'string' }, example: ['John Smith', 'Jane Doe'] },
                    ...reviewableEntityProperties,
                },
            },
            Profession: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '60c72b2f9b1d8b0015b3c132' },
                    professionName: { type: 'string', example: 'Software Developer' },
                    ...baseLocationProperties,
                    address: { type: 'string', example: '654 Professional St, New York, NY' },
                    specialty: { type: 'string', example: 'Web Development' },
                    ...reviewableEntityProperties,
                },
            },
            ProfessionalProfile: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '60c72b2f9b1d8b0015b3c133' },
                    user: { type: 'string', example: '60c72b2f9b1d8b0015b3c123' },
                    contact: commonContact,
                    skills: { type: 'array', items: { $ref: '#/components/schemas/Skill' } },
                    experience: { type: 'array', items: { $ref: '#/components/schemas/Experience' } },
                    education: { type: 'array', items: { $ref: '#/components/schemas/Education' } },
                    social: { type: 'array', items: { $ref: '#/components/schemas/Social' } },
                    date: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
                    ...reviewableEntityProperties,
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
                    content: {
                        type: 'string',
                        minLength: 10,
                        maxLength: 1000,
                        example: 'La mejor comida mexicana que he probado',
                    },
                    visitDate: { type: 'string', format: 'date', example: '2024-01-15' },
                    recommendedDishes: {
                        type: 'array',
                        items: { type: 'string', maxLength: 50 },
                        example: ['Tacos al pastor', 'Guacamole'],
                    },
                    tags: {
                        type: 'array',
                        items: { type: 'string', maxLength: 30 },
                        example: ['auténtico', 'familiar'],
                    },
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
        { name: 'Health Checks' },
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
        '/auth/refresh-token': {
            post: {
                tags: ['Authentication'],
                summary: 'Refresh an expired access token',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['refreshToken'],
                                properties: {
                                    refreshToken: {
                                        type: 'string',
                                        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Token refreshed successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                                        refreshToken: {
                                            type: 'string',
                                            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '400': createBadRequestResponse('Invalid or expired refresh token'),
                    '500': createStandardResponses()['500'],
                },
            },
        },
        '/auth/logout': {
            post: {
                tags: ['Authentication'],
                summary: 'Logout and blacklist current token',
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': createSuccessMessageResponse('Logged out successfully'),
                    '401': createUnauthorizedResponse(),
                    '500': createStandardResponses()['500'],
                },
            },
        },
        '/auth/revoke-all-tokens': {
            post: {
                tags: ['Authentication'],
                summary: 'Revoke all user tokens (logout from all devices)',
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': createSuccessMessageResponse('All tokens revoked successfully'),
                    '401': createUnauthorizedResponse(),
                    '500': createStandardResponses()['500'],
                },
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
        '/users/profile': {
            get: {
                tags: ['Users'],
                summary: 'Get current authenticated user profile',
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': createDataResponse('User', 'User profile retrieved successfully'),
                    '401': createUnauthorizedResponse(),
                    '404': createNotFoundResponse('User'),
                    '500': createStandardResponses()['500'],
                },
            },
            put: {
                tags: ['Users'],
                summary: 'Update current user profile',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    username: { type: 'string', example: 'updatedUsername' },
                                    email: { type: 'string', format: 'email', example: 'updated@example.com' },
                                    firstName: { type: 'string', example: 'John' },
                                    lastName: { type: 'string', example: 'Doe' },
                                    photo: { type: 'string', example: 'profile.jpg' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Profile updated successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/User' },
                                    },
                                },
                            },
                        },
                    },
                    '401': createUnauthorizedResponse(),
                    '400': createBadRequestResponse('Invalid profile data'),
                    '500': createStandardResponses()['500'],
                },
            },
        },
        '/users/profile/{id}': {
            put: {
                tags: ['Users'],
                summary: 'Update user profile by ID (admin)',
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
                                example: {
                                    success: false,
                                    message: 'You can only modify your own reviews',
                                    error: 'Forbidden',
                                },
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
                                example: {
                                    success: false,
                                    message: 'You can only modify your own reviews',
                                    error: 'Forbidden',
                                },
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
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'Cache statistics retrieved successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                stats: { $ref: '#/components/schemas/CacheStats' },
                                                performance: { type: 'object' },
                                                timestamp: { type: 'string', format: 'date-time' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '401': createUnauthorizedResponse(),
                    '500': createStandardResponses()['500'],
                },
            },
        },
        '/cache/health': {
            get: {
                tags: ['Cache Management'],
                summary: 'Get cache health status',
                responses: {
                    '200': {
                        description: 'Cache health status retrieved successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            allOf: [
                                                { $ref: '#/components/schemas/CacheStats' },
                                                {
                                                    type: 'object',
                                                    properties: {
                                                        status: {
                                                            type: 'string',
                                                            enum: ['healthy', 'unhealthy'],
                                                            example: 'healthy',
                                                        },
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '500': {
                        description: 'Cache health check failed',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: false },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                status: { type: 'string', example: 'unhealthy' },
                                                error: { type: 'string' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/cache/invalidate/{pattern}': {
            delete: {
                tags: ['Cache Management'],
                summary: 'Invalidate cache by pattern',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'pattern',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Cache pattern to invalidate (supports wildcards)',
                        example: 'restaurants:*',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Cache pattern invalidated successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Cache pattern invalidated successfully' },
                                    },
                                },
                            },
                        },
                    },
                    '400': createBadRequestResponse('Pattern parameter is required'),
                    '401': createUnauthorizedResponse(),
                    '500': createStandardResponses()['500'],
                },
            },
        },
        '/cache/invalidate-tag/{tag}': {
            delete: {
                tags: ['Cache Management'],
                summary: 'Invalidate cache by tag',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'tag',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Cache tag to invalidate',
                        example: 'restaurants',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Cache tag invalidated successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Cache tag invalidated successfully' },
                                    },
                                },
                            },
                        },
                    },
                    '400': createBadRequestResponse('Tag parameter is required'),
                    '401': createUnauthorizedResponse(),
                    '500': createStandardResponses()['500'],
                },
            },
        },
        '/cache/flush': {
            delete: {
                tags: ['Cache Management'],
                summary: 'Flush all cache',
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'Cache flushed successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Cache flushed successfully' },
                                    },
                                },
                            },
                        },
                    },
                    '401': createUnauthorizedResponse(),
                    '500': createStandardResponses()['500'],
                },
            },
        },
        '/cache/monitor/{action}': {
            post: {
                tags: ['Cache Management'],
                summary: 'Start or stop cache monitoring',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'action',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', enum: ['start', 'stop'] },
                        description: 'Action to perform: start or stop monitoring',
                        example: 'start',
                    },
                ],
                requestBody: {
                    required: false,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    interval: {
                                        type: 'number',
                                        description: 'Monitoring interval in minutes (only for start action)',
                                        example: 5,
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Cache monitoring action executed successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Cache monitoring started' },
                                    },
                                },
                            },
                        },
                    },
                    '400': createBadRequestResponse('Invalid action. Use "start" or "stop"'),
                    '401': createUnauthorizedResponse(),
                    '500': createStandardResponses()['500'],
                },
            },
        },

        // Review collection endpoints for specific resources
        ...createReviewCollectionEndpoints('Markets'),
        ...createReviewCollectionEndpoints('Recipes'),
        ...createReviewCollectionEndpoints('Restaurants', 'restaurantId'),

        // Health Check endpoints
        '/health': {
            get: {
                tags: ['Health Checks'],
                summary: 'Liveness probe - Check if server is alive',
                description:
                    'Indicates if the server process is running. Used by orchestrators like Kubernetes for liveness probes.',
                responses: {
                    '200': {
                        description: 'Server is alive',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', example: 'alive' },
                                        timestamp: {
                                            type: 'string',
                                            format: 'date-time',
                                            example: '2024-01-15T10:30:00Z',
                                        },
                                        uptime: {
                                            type: 'number',
                                            description: 'Process uptime in seconds',
                                            example: 3600.5,
                                        },
                                        environment: { type: 'string', example: 'production' },
                                    },
                                },
                                example: {
                                    status: 'alive',
                                    timestamp: '2024-01-15T10:30:00Z',
                                    uptime: 3600.5,
                                    environment: 'production',
                                },
                            },
                        },
                    },
                },
            },
        },
        '/health/ready': {
            get: {
                tags: ['Health Checks'],
                summary: 'Readiness probe - Check if server is ready to accept requests',
                description:
                    'Indicates if the server is ready to accept traffic. Verifies MongoDB connection status. Used by orchestrators for readiness probes.',
                responses: {
                    '200': {
                        description: 'Server is ready',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        ready: { type: 'boolean', example: true },
                                        mongodb: { type: 'boolean', example: true },
                                        timestamp: {
                                            type: 'string',
                                            format: 'date-time',
                                            example: '2024-01-15T10:30:00Z',
                                        },
                                        message: { type: 'string', example: 'Service is ready to accept requests' },
                                    },
                                },
                                example: {
                                    ready: true,
                                    mongodb: true,
                                    timestamp: '2024-01-15T10:30:00Z',
                                    message: 'Service is ready to accept requests',
                                },
                            },
                        },
                    },
                    '503': {
                        description: 'Server is not ready',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        ready: { type: 'boolean', example: false },
                                        mongodb: { type: 'boolean', example: false },
                                        timestamp: { type: 'string', format: 'date-time' },
                                        message: { type: 'string', example: 'Service is not ready' },
                                    },
                                },
                                example: {
                                    ready: false,
                                    mongodb: false,
                                    timestamp: '2024-01-15T10:30:00Z',
                                    message: 'Service is not ready',
                                },
                            },
                        },
                    },
                },
            },
        },
        '/health/deep': {
            get: {
                tags: ['Health Checks'],
                summary: 'Deep health check - Comprehensive system status',
                description:
                    'Provides detailed health information including database connectivity, memory usage, and uptime. Useful for monitoring and debugging.',
                responses: {
                    '200': {
                        description: 'System is healthy',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', enum: ['healthy', 'degraded'], example: 'healthy' },
                                        timestamp: {
                                            type: 'string',
                                            format: 'date-time',
                                            example: '2024-01-15T10:30:00Z',
                                        },
                                        uptime: {
                                            type: 'string',
                                            description: 'Formatted uptime',
                                            example: '60 minutes',
                                        },
                                        services: {
                                            type: 'object',
                                            properties: {
                                                mongodb: { type: 'boolean', example: true },
                                            },
                                        },
                                        memory: {
                                            type: 'object',
                                            properties: {
                                                rss: {
                                                    type: 'string',
                                                    description: 'Resident Set Size',
                                                    example: '128MB',
                                                },
                                                heapUsed: {
                                                    type: 'string',
                                                    description: 'Heap memory used',
                                                    example: '64MB',
                                                },
                                                heapTotal: {
                                                    type: 'string',
                                                    description: 'Total heap memory',
                                                    example: '256MB',
                                                },
                                            },
                                        },
                                    },
                                },
                                example: {
                                    status: 'healthy',
                                    timestamp: '2024-01-15T10:30:00Z',
                                    uptime: '60 minutes',
                                    services: {
                                        mongodb: true,
                                    },
                                    memory: {
                                        rss: '128MB',
                                        heapUsed: '64MB',
                                        heapTotal: '256MB',
                                    },
                                },
                            },
                        },
                    },
                    '503': {
                        description: 'System is unhealthy or degraded',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: {
                                            type: 'string',
                                            enum: ['degraded', 'unhealthy'],
                                            example: 'degraded',
                                        },
                                        message: { type: 'string', example: 'Health check failed' },
                                        timestamp: { type: 'string', format: 'date-time' },
                                    },
                                },
                                example: {
                                    status: 'unhealthy',
                                    message: 'Health check failed',
                                    timestamp: '2024-01-15T10:30:00Z',
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};

export default swaggerDocument;
