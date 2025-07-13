import Joi from 'joi';

// Common validation patterns
const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const phonePattern = /^\+?[\d\s\-().]{10,}$/;
const urlPattern = /^https?:\/\/.+/;
const timePattern = /^([01]?\d|2[0-3]):[0-5]\d$/; // HH:MM format (24-hour)

// Common schemas
export const commonSchemas = {
    objectId: Joi.string().pattern(objectIdPattern).message('Must be a valid ObjectId'),
    email: Joi.string().pattern(emailPattern).message('Must be a valid email address'),
    phone: Joi.string().pattern(phonePattern).message('Must be a valid phone number'),
    url: Joi.string().pattern(urlPattern).message('Must be a valid URL'),
    time: Joi.string().pattern(timePattern).message('Must be a valid time in HH:MM format (24-hour)'),
    coordinates: Joi.array().items(Joi.number()).length(2),
    pagination: {
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
    },
};

// Reusable schema factories to reduce duplication
const createLocationSchema = (required = false) => {
    const schema = Joi.object({
        type: Joi.string().valid('Point').required(),
        coordinates: commonSchemas.coordinates.required(),
    });
    return required ? schema.required() : schema.optional();
};

const createSocialMediaSchema = () =>
    Joi.object({
        facebook: commonSchemas.url.optional(),
        instagram: commonSchemas.url.optional(),
        twitter: commonSchemas.url.optional(),
    }).optional();

const createOpeningHoursSchema = () =>
    Joi.object()
        .pattern(
            Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
            Joi.object({
                open: commonSchemas.time.required(),
                close: commonSchemas.time.required(),
            })
        )
        .optional();

const createBusinessBaseSchema = (isRequired = true) => {
    const schema = {
        name: Joi.string().trim().min(2).max(100),
        description: Joi.string().trim().max(1000).optional(),
        address: Joi.string().trim().max(200),
        phoneNumber: commonSchemas.phone,
        email: commonSchemas.email.optional(),
        website: commonSchemas.url.optional(),
        socialMedia: createSocialMediaSchema(),
        location: createLocationSchema(isRequired),
        openingHours: createOpeningHoursSchema(),
    };

    if (isRequired) {
        schema.name = schema.name.required();
        schema.address = schema.address.required();
        schema.phoneNumber = schema.phoneNumber.required();
    } else {
        schema.name = schema.name.optional();
        schema.address = schema.address.optional();
        schema.phoneNumber = schema.phoneNumber.optional();
    }

    return schema;
};

// User validation schemas
const createPasswordSchema = () =>
    Joi.string()
        .min(8)
        .max(128)
        .pattern(/^(?=[^\n]{8,128}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).*$/)
        .required()
        .messages({
            'string.pattern.base':
                'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
        });

const createNameSchema = (required = true) => {
    const schema = Joi.string().trim().min(2).max(50);
    return required ? schema.required() : schema.optional();
};

export const userSchemas = {
    register: Joi.object({
        username: createNameSchema(true),
        email: commonSchemas.email.required(),
        password: createPasswordSchema(),
        // Backward compatibility fields - optional to prevent breaking existing clients
        firstName: createNameSchema(false),
        lastName: createNameSchema(false),
        dateOfBirth: Joi.date().max('now').optional(),
        phoneNumber: commonSchemas.phone.optional(),
        location: createLocationSchema(false),
    }),

    login: Joi.object({
        email: commonSchemas.email.required(),
        password: Joi.string().required(),
    }),

    updateProfile: Joi.object({
        firstName: createNameSchema(false),
        lastName: createNameSchema(false),
        dateOfBirth: Joi.date().max('now').optional(),
        phoneNumber: commonSchemas.phone.optional(),
        location: createLocationSchema(false),
    }),
};

// Business validation schemas
export const businessSchemas = {
    create: Joi.object({
        ...createBusinessBaseSchema(true),
        category: Joi.string().trim().required(),
    }),

    update: Joi.object({
        ...createBusinessBaseSchema(false),
        category: Joi.string().trim().optional(),
    }),

    search: Joi.object({
        category: Joi.string().trim().optional(),
        latitude: Joi.number().min(-90).max(90).optional(),
        longitude: Joi.number().min(-180).max(180).optional(),
        radius: Joi.number().min(1).max(50000).default(5000),
        page: commonSchemas.pagination.page,
        limit: commonSchemas.pagination.limit,
    }),
};

// Restaurant validation schemas
export const restaurantSchemas = {
    create: Joi.object({
        ...createBusinessBaseSchema(true),
        cuisine: Joi.array().items(Joi.string().trim()).min(1).required(),
        priceRange: Joi.string().valid('$', '$$', '$$$', '$$$$').required(),
        features: Joi.array()
            .items(
                Joi.string().valid(
                    'outdoor-seating',
                    'delivery',
                    'takeout',
                    'reservations',
                    'wheelchair-accessible',
                    'parking',
                    'wifi',
                    'live-music'
                )
            )
            .optional(),
    }),
};

// Review validation schemas
export const reviewSchemas = {
    create: Joi.object({
        rating: Joi.number().integer().min(1).max(5).required(),
        title: Joi.string().trim().min(5).max(100).required(),
        content: Joi.string().trim().min(10).max(1000).required(),
        visitDate: Joi.date().max('now').optional(),
        recommendedDishes: Joi.array().items(Joi.string().trim().max(50)).optional(),
        tags: Joi.array().items(Joi.string().trim().max(30)).optional(),
    }),

    update: Joi.object({
        rating: Joi.number().integer().min(1).max(5).optional(),
        title: Joi.string().trim().min(5).max(100).optional(),
        content: Joi.string().trim().min(10).max(1000).optional(),
        visitDate: Joi.date().max('now').optional(),
        recommendedDishes: Joi.array().items(Joi.string().trim().max(50)).optional(),
        tags: Joi.array().items(Joi.string().trim().max(30)).optional(),
    }),
};

// Query parameter schemas
export const querySchemas = {
    geospatial: Joi.object({
        latitude: Joi.number().min(-90).max(90).optional(),
        longitude: Joi.number().min(-180).max(180).optional(),
        radius: Joi.number().min(1).max(50000).default(5000),
        page: commonSchemas.pagination.page,
        limit: commonSchemas.pagination.limit,
    }).and('latitude', 'longitude'), // Both latitude and longitude must be present together

    search: Joi.object({
        q: Joi.string().trim().min(1).max(100).optional(),
        category: Joi.string().trim().optional(),
        sortBy: Joi.string().valid('name', 'rating', 'distance', 'createdAt').default('name'),
        sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
        page: commonSchemas.pagination.page,
        limit: commonSchemas.pagination.limit,
    }),
};

// Parameter schemas
export const paramSchemas = {
    id: Joi.object({
        id: commonSchemas.objectId.required(),
    }),

    businessId: Joi.object({
        businessId: commonSchemas.objectId.required(),
    }),

    userId: Joi.object({
        userId: commonSchemas.objectId.required(),
    }),

    restaurantId: Joi.object({
        restaurantId: commonSchemas.objectId.required(),
    }),
};
