import express from "express";
import { protect } from "../middleware/authMiddleware";
import {
	getRecipes,
	getRecipeById,
	createRecipe,
	updateRecipe,
	addReviewToRecipe,
	deleteRecipe,
} from "../controllers/recipesControlllers";

const router = express.Router();

router.get("/", getRecipes);
router.get("/:id", getRecipeById);
router.post("/create", protect, createRecipe);
router.post("/add-review/:id", protect, addReviewToRecipe);
router.put("/update/:id", protect, updateRecipe);
router.delete("/delete/:id", protect, deleteRecipe);

export default router;
