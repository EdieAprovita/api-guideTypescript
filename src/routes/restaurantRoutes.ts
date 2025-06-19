import express from 'express';
import { protect, admin } from '../middleware/authMiddleware';
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

router.get('/', getRestaurants);
router.get('/top-rated', getTopRatedRestaurants);
router.get('/:id', getRestaurantById);

router.post('/', protect, createRestaurant);
router.post('/add-review/:id', protect, addReviewToRestaurant);
router.put('/:id', protect, admin, updateRestaurant);
router.delete('/:id', protect, admin, deleteRestaurant);

export default router;
