import express from 'express';
import { protect, admin } from '../middleware/authMiddleware';
import { browserCacheValidation, recipeCacheMiddleware } from '../middleware/cache';
import { validate, rateLimits } from '../middleware/validation';
import { paramSchemas } from '../utils/validators';
import {
    getRecipes,
    getRecipeById,
    createRecipe,
    updateRecipe,
    addReviewToRecipe,
    getRecipeReviews,
    getRecipeReviewStats,
    deleteRecipe,
} from '../controllers/recipesControllers';

const router = express.Router();

// Apply browser cache validation to all GET routes
router.use(browserCacheValidation());

router.get('/', recipeCacheMiddleware(), getRecipes);
router.get('/:id', recipeCacheMiddleware(), getRecipeById);
router.post('/', protect, createRecipe);
router.post('/add-review/:id', rateLimits.api, protect, addReviewToRecipe);

// Review routes
router.get('/:id/reviews', rateLimits.api, validate({ params: paramSchemas.recipeId }), getRecipeReviews);
router.get('/:id/reviews/stats', rateLimits.api, validate({ params: paramSchemas.recipeId }), getRecipeReviewStats);

router.put('/:id', protect, admin, updateRecipe);
router.delete('/:id', protect, admin, deleteRecipe);

export default router;
