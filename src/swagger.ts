import { OpenAPIV3 } from 'openapi-types';

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
                    rating: { type: 'number', minimum: 1, maximum: 5, example: 5 },
                    title: { type: 'string', minLength: 5, maxLength: 100, example: 'Excelente comida' },
                    content: { type: 'string', minLength: 10, maxLength: 1000, example: 'La mejor comida mexicana que he probado' },
                    visitDate: { type: 'string', format: 'date', example: '2024-01-15' },
                    recommendedDishes: { type: 'array', items: { type: 'string', maxLength: 50 }, example: ['Tacos al pastor', 'Guacamole'] },
                    tags: { type: 'array', items: { type: 'string', maxLength: 30 }, example: ['auténtico', 'familiar'] },
                    author: { type: 'string', example: '60c72b2f9b1d8b0015b3c123' },
                    restaurant: { type: 'string', example: '60c72b2f9b1d8b0015b3c126' },
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
                    '400': {
                        description: 'Invalid request',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                    '409': {
                        description: 'User already exists',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
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
                responses: {
                    '200': {
                        description: 'Successful login',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/User' },
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
                    '401': {
                        description: 'Unauthorized',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                },
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
                responses: {
                    '200': {
                        description: 'Password reset email sent',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Password reset email sent' },
                                    },
                                },
                            },
                        },
                    },
                },
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
                responses: {
                    '200': {
                        description: 'Password reset successful',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Password reset successful' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/users/logout': {
            post: {
                tags: ['Authentication'],
                summary: 'Logout user',
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'Logout successful',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Logout successful' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
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
            get: {
                tags: ['Users'],
                summary: 'Get user by ID',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'User ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'User retrieved successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/User' },
                            },
                        },
                    },
                    '404': {
                        description: 'User not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                },
            },
            delete: {
                tags: ['Users'],
                summary: 'Delete user',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'User ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'User deleted successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'User deleted successfully' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/users/profile/{id}': {
            put: {
                tags: ['Users'],
                summary: 'Update user profile',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'User ID',
                    },
                ],
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
                responses: {
                    '200': {
                        description: 'Profile updated successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/User' },
                            },
                        },
                    },
                },
            },
        },
        // Business endpoints
        '/businesses': {
            get: {
                tags: ['Businesses'],
                summary: 'Get all businesses',
                responses: {
                    '200': {
                        description: 'Businesses retrieved successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/Business' },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                tags: ['Businesses'],
                summary: 'Create business',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Business' },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'Business created successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Business' },
                            },
                        },
                    },
                },
            },
        },
        '/businesses/{id}': {
            get: {
                tags: ['Businesses'],
                summary: 'Get business by ID',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Business ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Business retrieved successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Business' },
                            },
                        },
                    },
                },
            },
            put: {
                tags: ['Businesses'],
                summary: 'Update business',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Business ID',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Business' },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Business updated successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Business' },
                            },
                        },
                    },
                },
            },
            delete: {
                tags: ['Businesses'],
                summary: 'Delete business',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Business ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Business deleted successfully',
                    },
                },
            },
        },
        '/businesses/add-review/{id}': {
            post: {
                tags: ['Businesses'],
                summary: 'Add review to business',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Business ID',
                    },
                ],
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
                },
            },
        },
        // Restaurant endpoints  
        '/restaurants': {
            get: {
                tags: ['Restaurants'],
                summary: 'Get all restaurants',
                responses: {
                    '200': {
                        description: 'Restaurants retrieved successfully',
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
            post: {
                tags: ['Restaurants'],
                summary: 'Create restaurant',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Restaurant' },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'Restaurant created successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Restaurant' },
                            },
                        },
                    },
                },
            },
        },
        '/restaurants/{id}': {
            get: {
                tags: ['Restaurants'],
                summary: 'Get restaurant by ID',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Restaurant ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Restaurant retrieved successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Restaurant' },
                            },
                        },
                    },
                },
            },
            put: {
                tags: ['Restaurants'],
                summary: 'Update restaurant',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Restaurant ID',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Restaurant' },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Restaurant updated successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Restaurant' },
                            },
                        },
                    },
                },
            },
            delete: {
                tags: ['Restaurants'],
                summary: 'Delete restaurant',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Restaurant ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Restaurant deleted successfully',
                    },
                },
            },
        },
        '/restaurants/add-review/{id}': {
            post: {
                tags: ['Restaurants'],
                summary: 'Add review to restaurant',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Restaurant ID',
                    },
                ],
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
                },
            },
        },
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
        // Doctor endpoints
        '/doctors': {
            get: {
                tags: ['Doctors'],
                summary: 'Get all doctors',
                responses: {
                    '200': {
                        description: 'Doctors retrieved successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/Doctor' },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                tags: ['Doctors'],
                summary: 'Create doctor',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Doctor' },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'Doctor created successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Doctor' },
                            },
                        },
                    },
                },
            },
        },
        '/doctors/{id}': {
            get: {
                tags: ['Doctors'],
                summary: 'Get doctor by ID',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Doctor ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Doctor retrieved successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Doctor' },
                            },
                        },
                    },
                },
            },
            put: {
                tags: ['Doctors'],
                summary: 'Update doctor',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Doctor ID',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Doctor' },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Doctor updated successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Doctor' },
                            },
                        },
                    },
                },
            },
            delete: {
                tags: ['Doctors'],
                summary: 'Delete doctor',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Doctor ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Doctor deleted successfully',
                    },
                },
            },
        },
        '/doctors/add-review/{id}': {
            post: {
                tags: ['Doctors'],
                summary: 'Add review to doctor',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Doctor ID',
                    },
                ],
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
                },
            },
        },
        // Market endpoints
        '/markets': {
            get: {
                tags: ['Markets'],
                summary: 'Get all markets',
                responses: {
                    '200': {
                        description: 'Markets retrieved successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/Market' },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                tags: ['Markets'],
                summary: 'Create market',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Market' },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'Market created successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Market' },
                            },
                        },
                    },
                },
            },
        },
        '/markets/{id}': {
            get: {
                tags: ['Markets'],
                summary: 'Get market by ID',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Market ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Market retrieved successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Market' },
                            },
                        },
                    },
                },
            },
            put: {
                tags: ['Markets'],
                summary: 'Update market',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Market ID',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Market' },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Market updated successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Market' },
                            },
                        },
                    },
                },
            },
            delete: {
                tags: ['Markets'],
                summary: 'Delete market',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Market ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Market deleted successfully',
                    },
                },
            },
        },
        '/markets/add-review/{id}': {
            post: {
                tags: ['Markets'],
                summary: 'Add review to market',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Market ID',
                    },
                ],
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
                },
            },
        },
        // Recipe endpoints
        '/recipes': {
            get: {
                tags: ['Recipes'],
                summary: 'Get all recipes',
                responses: {
                    '200': {
                        description: 'Recipes retrieved successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/Recipe' },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                tags: ['Recipes'],
                summary: 'Create recipe',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Recipe' },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'Recipe created successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Recipe' },
                            },
                        },
                    },
                },
            },
        },
        '/recipes/{id}': {
            get: {
                tags: ['Recipes'],
                summary: 'Get recipe by ID',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Recipe ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Recipe retrieved successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Recipe' },
                            },
                        },
                    },
                },
            },
            put: {
                tags: ['Recipes'],
                summary: 'Update recipe',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Recipe ID',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Recipe' },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Recipe updated successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Recipe' },
                            },
                        },
                    },
                },
            },
            delete: {
                tags: ['Recipes'],
                summary: 'Delete recipe',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Recipe ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Recipe deleted successfully',
                    },
                },
            },
        },
        '/recipes/add-review/{id}': {
            post: {
                tags: ['Recipes'],
                summary: 'Add review to recipe',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Recipe ID',
                    },
                ],
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
                },
            },
        },
        // Post endpoints
        '/posts': {
            get: {
                tags: ['Posts'],
                summary: 'Get all posts',
                responses: {
                    '200': {
                        description: 'Posts retrieved successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/Post' },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                tags: ['Posts'],
                summary: 'Create post',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Post' },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'Post created successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Post' },
                            },
                        },
                    },
                },
            },
        },
        '/posts/{id}': {
            get: {
                tags: ['Posts'],
                summary: 'Get post by ID',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Post ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Post retrieved successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Post' },
                            },
                        },
                    },
                },
            },
            put: {
                tags: ['Posts'],
                summary: 'Update post',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Post ID',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Post' },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Post updated successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Post' },
                            },
                        },
                    },
                },
            },
            delete: {
                tags: ['Posts'],
                summary: 'Delete post',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Post ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Post deleted successfully',
                    },
                },
            },
        },
        '/posts/like/{id}': {
            post: {
                tags: ['Posts'],
                summary: 'Like a post',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Post ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Post liked successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Post' },
                            },
                        },
                    },
                },
            },
        },
        '/posts/unlike/{id}': {
            post: {
                tags: ['Posts'],
                summary: 'Unlike a post',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Post ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Post unliked successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Post' },
                            },
                        },
                    },
                },
            },
        },
        '/posts/comment/{id}': {
            post: {
                tags: ['Posts'],
                summary: 'Add comment to post',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Post ID',
                    },
                ],
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
        // Sanctuary endpoints
        '/sanctuaries': {
            get: {
                tags: ['Sanctuaries'],
                summary: 'Get all sanctuaries',
                responses: {
                    '200': {
                        description: 'Sanctuaries retrieved successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/Sanctuary' },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                tags: ['Sanctuaries'],
                summary: 'Create sanctuary',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Sanctuary' },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'Sanctuary created successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Sanctuary' },
                            },
                        },
                    },
                },
            },
        },
        '/sanctuaries/{id}': {
            get: {
                tags: ['Sanctuaries'],
                summary: 'Get sanctuary by ID',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Sanctuary ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Sanctuary retrieved successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Sanctuary' },
                            },
                        },
                    },
                },
            },
            put: {
                tags: ['Sanctuaries'],
                summary: 'Update sanctuary',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Sanctuary ID',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Sanctuary' },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Sanctuary updated successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Sanctuary' },
                            },
                        },
                    },
                },
            },
            delete: {
                tags: ['Sanctuaries'],
                summary: 'Delete sanctuary',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Sanctuary ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Sanctuary deleted successfully',
                    },
                },
            },
        },
        '/sanctuaries/add-review/{id}': {
            post: {
                tags: ['Sanctuaries'],
                summary: 'Add review to sanctuary',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Sanctuary ID',
                    },
                ],
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
                },
            },
        },
        // Profession endpoints
        '/professions': {
            get: {
                tags: ['Professions'],
                summary: 'Get all professions',
                responses: {
                    '200': {
                        description: 'Professions retrieved successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/Profession' },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                tags: ['Professions'],
                summary: 'Create profession',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Profession' },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'Profession created successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Profession' },
                            },
                        },
                    },
                },
            },
        },
        '/professions/{id}': {
            get: {
                tags: ['Professions'],
                summary: 'Get profession by ID',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Profession ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Profession retrieved successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Profession' },
                            },
                        },
                    },
                },
            },
            put: {
                tags: ['Professions'],
                summary: 'Update profession',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Profession ID',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Profession' },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Profession updated successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Profession' },
                            },
                        },
                    },
                },
            },
            delete: {
                tags: ['Professions'],
                summary: 'Delete profession',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Profession ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Profession deleted successfully',
                    },
                },
            },
        },
        '/professions/add-review/{id}': {
            post: {
                tags: ['Professions'],
                summary: 'Add review to profession',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Profession ID',
                    },
                ],
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
                },
            },
        },
        // Professional Profile endpoints
        '/professionalProfile': {
            get: {
                tags: ['Professional Profiles'],
                summary: 'Get all professional profiles',
                responses: {
                    '200': {
                        description: 'Professional profiles retrieved successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/ProfessionalProfile' },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                tags: ['Professional Profiles'],
                summary: 'Create professional profile',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ProfessionalProfile' },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'Professional profile created successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ProfessionalProfile' },
                            },
                        },
                    },
                },
            },
        },
        '/professionalProfile/{id}': {
            get: {
                tags: ['Professional Profiles'],
                summary: 'Get professional profile by ID',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Professional Profile ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Professional profile retrieved successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ProfessionalProfile' },
                            },
                        },
                    },
                },
            },
            put: {
                tags: ['Professional Profiles'],
                summary: 'Update professional profile',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Professional Profile ID',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ProfessionalProfile' },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Professional profile updated successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ProfessionalProfile' },
                            },
                        },
                    },
                },
            },
            delete: {
                tags: ['Professional Profiles'],
                summary: 'Delete professional profile',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Professional Profile ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Professional profile deleted successfully',
                    },
                },
            },
        },
        // Review endpoints
        '/reviews/{id}': {
            get: {
                tags: ['Reviews'],
                summary: 'Get review by ID',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Review ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Review retrieved successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Review' },
                            },
                        },
                    },
                    '404': {
                        description: 'Review not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                },
            },
            put: {
                tags: ['Reviews'],
                summary: 'Update review',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Review ID',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Review' },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Review updated successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Review' },
                            },
                        },
                    },
                    '404': {
                        description: 'Review not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
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
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Review ID',
                    },
                ],
                responses: {
                    '200': {
                        description: 'Review marked as helpful',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Review marked as helpful' },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Review not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
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
                responses: {
                    '200': {
                        description: 'Cache stats retrieved successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { type: 'object' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/cache/health': {
            get: {
                tags: ['Cache Management'],
                summary: 'Get cache health status',
                responses: {
                    '200': {
                        description: 'Cache health retrieved successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { type: 'object' },
                                    },
                                },
                            },
                        },
                    },
                },
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
                responses: {
                    '200': {
                        description: 'Cache warming started successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { type: 'object' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/cache/alerts': {
            get: {
                tags: ['Cache Management'],
                summary: 'Get cache alerts',
                responses: {
                    '200': {
                        description: 'Cache alerts retrieved successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { type: 'object' },
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
                responses: {
                    '200': {
                        description: 'Cache invalidated successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Cache invalidated successfully' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/cache/flush': {
            delete: {
                tags: ['Cache Management'],
                summary: 'Flush all cache',
                responses: {
                    '200': {
                        description: 'All cache flushed successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'All cache flushed successfully' },
                                    },
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