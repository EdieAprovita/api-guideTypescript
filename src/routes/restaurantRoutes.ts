import express from "express";
import { protect, admin } from "../middleware/authMiddleware";
import {
	getRestaurants,
	getRestaurantById,
	createRestaurant,
	updateRestaurant,
	deleteRestaurant,
} from "../controllers/restaurantControllers";

const router = express.Router();

router.get("/", getRestaurants);
router.get("/:id", getRestaurantById);
router.post("/create", protect, createRestaurant);
router.put("/update/:id", protect, admin, updateRestaurant);
router.delete("/delete/:id", protect, admin, deleteRestaurant);

export default router;
