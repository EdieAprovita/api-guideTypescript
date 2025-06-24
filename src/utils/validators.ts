import Joi from 'joi';

// Common validation patterns
const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const phonePattern = /^[+]?[\d\s\-().]{10,}$/;
const urlPattern = /^https?:\/\/.+/;

// Common schemas
export const commonSchemas = {
  objectId: Joi.string().pattern(objectIdPattern).message('Must be a valid ObjectId'),
  email: Joi.string().pattern(emailPattern).message('Must be a valid email address'),
  phone: Joi.string().pattern(phonePattern).message('Must be a valid phone number'),
  url: Joi.string().pattern(urlPattern).message('Must be a valid URL'),
  coordinates: Joi.array().items(Joi.number()).length(2),
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }
};

// User validation schemas
export const userSchemas = {
  register: Joi.object({
    firstName: Joi.string().trim().min(2).max(50).required(),
    lastName: Joi.string().trim().min(2).max(50).required(),
    email: commonSchemas.email.required(),
    password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
      .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
      }),
    dateOfBirth: Joi.date().max('now').required(),
    phoneNumber: commonSchemas.phone.optional(),
    location: Joi.object({
      type: Joi.string().valid('Point').required(),
      coordinates: commonSchemas.coordinates.required()
    }).optional()
  }),

  login: Joi.object({
    email: commonSchemas.email.required(),
    password: Joi.string().required()
  }),

  updateProfile: Joi.object({
    firstName: Joi.string().trim().min(2).max(50).optional(),
    lastName: Joi.string().trim().min(2).max(50).optional(),
    phoneNumber: commonSchemas.phone.optional(),
    dateOfBirth: Joi.date().max('now').optional(),
    location: Joi.object({
      type: Joi.string().valid('Point').required(),
      coordinates: commonSchemas.coordinates.required()
    }).optional()
  })
};

// Business validation schemas
export const businessSchemas = {
  create: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    description: Joi.string().trim().max(1000).optional(),
    category: Joi.string().trim().required(),
    address: Joi.string().trim().max(200).required(),
    phoneNumber: commonSchemas.phone.required(),
    email: commonSchemas.email.optional(),
    website: commonSchemas.url.optional(),
    socialMedia: Joi.object({
      facebook: commonSchemas.url.optional(),
      instagram: commonSchemas.url.optional(),
      twitter: commonSchemas.url.optional()
    }).optional(),
    location: Joi.object({
      type: Joi.string().valid('Point').required(),
      coordinates: commonSchemas.coordinates.required()
    }).required(),
    openingHours: Joi.object().pattern(
      Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
      Joi.object({
        open: Joi.string().pattern(timePattern).required(),
        close: Joi.string().pattern(timePattern).required()
      })
    ).optional()
  }),

  update: Joi.object({
    name: Joi.string().trim().min(2).max(100).optional(),
    description: Joi.string().trim().max(1000).optional(),
    category: Joi.string().trim().optional(),
    address: Joi.string().trim().max(200).optional(),
    phoneNumber: commonSchemas.phone.optional(),
    email: commonSchemas.email.optional(),
    website: commonSchemas.url.optional(),
    socialMedia: Joi.object({
      facebook: commonSchemas.url.optional(),
      instagram: commonSchemas.url.optional(),
      twitter: commonSchemas.url.optional()
    }).optional(),
    location: Joi.object({
      type: Joi.string().valid('Point').required(),
      coordinates: commonSchemas.coordinates.required()
    }).optional(),
    openingHours: Joi.object().pattern(
      Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
      Joi.object({
        open: Joi.string().pattern(/^([01]?\d|2[0-3]):[0-5]\d$/).required(),
        close: Joi.string().pattern(/^([01]?\d|2[0-3]):[0-5]\d$/).required()
      })
    ).optional()
  }),

  search: Joi.object({
    category: Joi.string().trim().optional(),
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    radius: Joi.number().min(1).max(50000).default(5000),
    ...commonSchemas.pagination
  })
};

// Restaurant validation schemas
export const restaurantSchemas = {
  create: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    description: Joi.string().trim().max(1000).optional(),
    cuisine: Joi.array().items(Joi.string().trim()).min(1).required(),
    priceRange: Joi.string().valid('$', '$$', '$$$', '$$$$').required(),
    address: Joi.string().trim().max(200).required(),
    phoneNumber: commonSchemas.phone.required(),
    email: commonSchemas.email.optional(),
    website: commonSchemas.url.optional(),
    location: Joi.object({
      type: Joi.string().valid('Point').required(),
      coordinates: commonSchemas.coordinates.required()
    }).required(),
    openingHours: Joi.object().pattern(
      Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
      Joi.object({
        open: Joi.string().pattern(/^([01]?\d|2[0-3]):[0-5]\d$/).required(),
        close: Joi.string().pattern(/^([01]?\d|2[0-3]):[0-5]\d$/).required()
      })
    ).optional(),
    features: Joi.array().items(Joi.string().valid(
      'outdoor-seating', 'delivery', 'takeout', 'reservations', 
      'wheelchair-accessible', 'parking', 'wifi', 'live-music'
    )).optional()
  })
};

// Review validation schemas
export const reviewSchemas = {
  create: Joi.object({
    businessId: commonSchemas.objectId.required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().trim().min(10).max(1000).required(),
    images: Joi.array().items(commonSchemas.url).max(5).optional()
  }),

  update: Joi.object({
    rating: Joi.number().integer().min(1).max(5).optional(),
    comment: Joi.string().trim().min(10).max(1000).optional(),
    images: Joi.array().items(commonSchemas.url).max(5).optional()
  })
};

// Query parameter schemas
export const querySchemas = {
  geospatial: Joi.object({
    latitude: Joi.number().min(-90).max(90).when('longitude', { is: Joi.exist(), then: Joi.required() }),
    longitude: Joi.number().min(-180).max(180).when('latitude', { is: Joi.exist(), then: Joi.required() }),
    radius: Joi.number().min(1).max(50000).default(5000),
    ...commonSchemas.pagination
  }),

  search: Joi.object({
    q: Joi.string().trim().min(1).max(100).optional(),
    category: Joi.string().trim().optional(),
    sortBy: Joi.string().valid('name', 'rating', 'distance', 'createdAt').default('name'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
    ...commonSchemas.pagination
  })
};

// Parameter schemas
export const paramSchemas = {
  id: Joi.object({
    id: commonSchemas.objectId.required()
  }),

  businessId: Joi.object({
    businessId: commonSchemas.objectId.required()
  }),

  userId: Joi.object({
    userId: commonSchemas.objectId.required()
  })
};