import express from 'express';
import { protect, admin } from '../middleware/authMiddleware';
import { browserCacheValidation, recipeCacheMiddleware } from '../middleware/cache';
import {
    getRecipes,
    getRecipeById,
    createRecipe,
    updateRecipe,
    addReviewToRecipe,
    deleteRecipe,
} from '../controllers/recipesControllers';

const router = express.Router();

// Apply browser cache validation to all GET routes
router.use(browserCacheValidation());

router.get('/', recipeCacheMiddleware(), getRecipes);
router.get('/:id', recipeCacheMiddleware(), getRecipeById);
router.post('/', protect, createRecipe);
router.post('/add-review/:id', protect, addReviewToRecipe);
router.put('/:id', protect, admin, updateRecipe);
router.delete('/:id', protect, admin, deleteRecipe);

export default router;
