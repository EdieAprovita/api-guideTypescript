import express from "express";
import { protect, admin } from "../middleware/authMiddleware";
import {
	getRecipes,
	getRecipeById,
	createRecipe,
	updateRecipe,
	addReviewToRecipe,
	deleteRecipe,
} from "../controllers/recipesControllers";

const router = express.Router();

router.get("/", getRecipes);
router.get("/:id", getRecipeById);
router.post("/", protect, createRecipe);
router.post("/add-review/:id", protect, addReviewToRecipe);
router.put("/:id", protect, admin, updateRecipe);
router.delete("/:id", protect, admin, deleteRecipe);

export default router;
