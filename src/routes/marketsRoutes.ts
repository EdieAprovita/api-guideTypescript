import express from 'express';
import { protect, admin } from '../middleware/authMiddleware';
import {
    getMarkets,
    getMarketById,
    createMarket,
    updateMarket,
    addReviewToMarket,
    deleteMarket,
} from '../controllers/marketsControllers';
import { registerLegacyRoutes } from '../utils/registerLegacyRoutes';

const router = express.Router();

router.get('/', getMarkets);
router.get('/:id', getMarketById);

// Deprecated action routes are kept for legacy clients and will be removed in
// the next major version.
registerLegacyRoutes(router, {
    create: createMarket,
    update: updateMarket,
    remove: deleteMarket,
});

router.post('/', protect, createMarket);
router.post('/add-review/:id', protect, addReviewToMarket);
router.put('/:id', protect, admin, updateMarket);
router.delete('/:id', protect, admin, deleteMarket);

export default router;
