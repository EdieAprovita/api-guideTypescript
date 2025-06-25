import express from 'express';
import { protect, admin } from '../middleware/authMiddleware';
import { validate, sanitizeInput, rateLimits, securityHeaders, validateInputLength } from '../middleware/validation';
import { restaurantSchemas, paramSchemas, querySchemas, reviewSchemas } from '../utils/validators';
import {
    getRestaurants,
    getRestaurantById,
    createRestaurant,
    updateRestaurant,
    addReviewToRestaurant,
    deleteRestaurant,
    getTopRatedRestaurants,
} from '../controllers/restaurantControllers';

const router = express.Router();

// Apply security headers and sanitization to all routes
router.use(securityHeaders);
router.use(...sanitizeInput());

// Public routes with rate limiting and search validation
router.get('/', 
    rateLimits.search,
    validate({ query: querySchemas.geospatial }),
    getRestaurants
);

router.get('/top-rated', 
    rateLimits.api,
    validate({ query: querySchemas.search }),
    getTopRatedRestaurants
);

router.get('/:id', 
    rateLimits.api,
    validate({ params: paramSchemas.id }),
    getRestaurantById
);

// Protected routes with validation
router.post('/', 
    rateLimits.api,
    validateInputLength(8192), // 8KB limit for restaurant creation
    protect, 
    validate({ body: restaurantSchemas.create }),
    createRestaurant
);

router.post('/add-review/:id', 
    rateLimits.api,
    validateInputLength(2048), // 2KB limit for reviews
    protect, 
    validate({ 
        params: paramSchemas.id,
        body: reviewSchemas.create 
    }),
    addReviewToRestaurant
);

router.put('/:id', 
    rateLimits.api,
    validateInputLength(8192), // 8KB limit for restaurant updates
    protect, 
    admin, 
    validate({ 
        params: paramSchemas.id,
        body: restaurantSchemas.create 
    }),
    updateRestaurant
);

router.delete('/:id', 
    rateLimits.api,
    protect, 
    admin, 
    validate({ params: paramSchemas.id }),
    deleteRestaurant
);

export default router;
