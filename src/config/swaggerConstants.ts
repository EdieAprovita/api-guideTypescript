/**
 * Swagger/OpenAPI Constants and Reusable Components
 * Extracted to reduce duplication in swagger.ts
 */

// Common schema references
export const commonSchemaRefs = {
    author: { $ref: '#/components/schemas/ObjectId' as const },
    reviews: { type: 'array' as const, items: { $ref: '#/components/schemas/Review' as const } },
    rating: { type: 'number' as const },
    numReviews: { type: 'number' as const },
    timestamps: {
        createdAt: { type: 'string' as const, format: 'date-time' as const },
        updatedAt: { type: 'string' as const, format: 'date-time' as const },
    },
    location: { $ref: '#/components/schemas/GeoJSONPoint' as const },
    contact: { type: 'array' as const, items: { $ref: '#/components/schemas/Contact' as const } },
};

// Reusable property groups
export const propertyGroups = {
    reviewableEntity: {
        reviews: commonSchemaRefs.reviews,
        rating: commonSchemaRefs.rating,
        numReviews: commonSchemaRefs.numReviews,
        ...commonSchemaRefs.timestamps,
    },
    baseLocation: {
        author: commonSchemaRefs.author,
        location: commonSchemaRefs.location,
        contact: commonSchemaRefs.contact,
    },
    timestamped: commonSchemaRefs.timestamps,
};

// Common response status codes
export const statusCodes = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
} as const;

// Common parameter definitions
export const commonParameters = {
    idInPath: {
        name: 'id',
        in: 'path' as const,
        required: true,
        schema: { type: 'string' as const },
        description: 'Resource ID',
    },
    pageNumber: {
        name: 'page',
        in: 'query' as const,
        required: false,
        schema: { type: 'integer' as const, minimum: 1, default: 1 },
        description: 'Page number',
    },
    pageSize: {
        name: 'limit',
        in: 'query' as const,
        required: false,
        schema: { type: 'integer' as const, minimum: 1, maximum: 100, default: 10 },
        description: 'Number of items per page',
    },
};

// Standard content type
export const applicationJson = 'application/json' as const;

// Schema reference helper
export const schemaRef = (schemaName: string) => ({ $ref: `#/components/schemas/${schemaName}` });

// Common security requirements
export const securityRequirements = {
    bearer: [{ bearerAuth: [] }],
    none: [],
};
