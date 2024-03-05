import express from "express";
import { protect } from "../middleware/authMiddleware";
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
router.post("/create", protect, createRestaurant);
router.post("/add-review/:id", protect, addReviewToRestaurant);
router.put("/update/:id", protect, updateRestaurant);
router.delete("/delete/:id", protect, deleteRestaurant);

export default router;
