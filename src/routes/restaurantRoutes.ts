import express from "express";
import { protect, admin } from "../middleware/authMiddleware";
import {
        getRestaurants,
        getRestaurantById,
        createRestaurant,
        updateRestaurant,
        addReviewToRestaurant,
        deleteRestaurant,
} from "../controllers/restaurantControllers";
import { registerLegacyRoutes } from "../utils/registerLegacyRoutes";

const router = express.Router();

router.get("/", getRestaurants);
router.get("/:id", getRestaurantById);

// Deprecated action routes are kept for legacy clients and will be removed in
// the next major version.
registerLegacyRoutes(router, {
        create: createRestaurant,
        update: updateRestaurant,
        remove: deleteRestaurant,
});

router.post("/", protect, createRestaurant);
router.post("/add-review/:id", protect, addReviewToRestaurant);
router.put("/:id", protect, admin, updateRestaurant);
router.delete("/:id", protect, admin, deleteRestaurant);

export default router;
