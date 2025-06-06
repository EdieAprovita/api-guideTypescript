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

const router = express.Router();

router.get("/", getRestaurants);
router.get("/:id", getRestaurantById);

// Accept legacy style endpoints alongside RESTful routes
router.post("/create", protect, createRestaurant);
router.post("/", protect, createRestaurant);

router.post("/add-review/:id", protect, addReviewToRestaurant);

router.put("/update/:id", protect, admin, updateRestaurant);
router.put("/:id", protect, admin, updateRestaurant);

router.delete("/delete/:id", protect, admin, deleteRestaurant);
router.delete("/:id", protect, admin, deleteRestaurant);

export default router;
