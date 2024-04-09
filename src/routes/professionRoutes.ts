import express from "express";
import { protect, admin } from "../middleware/authMiddleware";
import {
	getProfessions,
	getProfessionById,
	createProfession,
	addReviewToProfession,
	updateProfession,
	deleteProfession,
} from "../controllers/professionControllers";

const router = express.Router();

router.get("/", getProfessions);
router.get("/:id", getProfessionById);
router.post("/create", protect, admin, createProfession);
router.post("/add-review/:id", protect, admin, addReviewToProfession);
router.put("/update/:id", protect, admin, updateProfession);
router.delete("/delete/:id", protect, admin, deleteProfession);

export default router;
