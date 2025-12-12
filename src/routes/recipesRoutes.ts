import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { browserCacheValidation, recipeCacheMiddleware } from '../middleware/cache.js';
import { validate, rateLimits, validateInputLength } from '../middleware/validation.js';
import { paramSchemas, reviewSchemas } from '../utils/validators.js';
import {
    getRecipes,
    getRecipeById,
    createRecipe,
    updateRecipe,
    addReviewToRecipe,
    getRecipeReviews,
    getRecipeReviewStats,
    deleteRecipe,
} from '../controllers/recipesControllers.js';

const router = express.Router();

// Apply browser cache validation to all GET routes
router.use(browserCacheValidation());

router.get('/', recipeCacheMiddleware(), getRecipes);
router.get('/:id', recipeCacheMiddleware(), getRecipeById);
router.post('/', protect, createRecipe);

// Standardized review routes (new OpenAPI 3.0 compliant paths)
router.post(
    '/:id/reviews',
    rateLimits.api,
    protect,
    validateInputLength(2048),
    validate({
        params: paramSchemas.recipeId,
        body: reviewSchemas.create,
    }),
    addReviewToRecipe
);

// Legacy review route (kept for backward compatibility)
router.post(
    '/add-review/:id',
    rateLimits.api,
    protect,
    validateInputLength(2048),
    validate({
        params: paramSchemas.recipeId,
        body: reviewSchemas.create,
    }),
    addReviewToRecipe
);
router.get('/:id/reviews', rateLimits.api, validate({ params: paramSchemas.recipeId }), getRecipeReviews);
router.get('/:id/reviews/stats', rateLimits.api, validate({ params: paramSchemas.recipeId }), getRecipeReviewStats);

router.put('/:id', protect, admin, updateRecipe);
router.delete('/:id', protect, admin, deleteRecipe);

export default router;
