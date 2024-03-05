import express from "express";
import { protect, professional } from "../middleware/authMiddleware";
import {
	getProfessions,
	getProfessionById,
	createProfession,
	updateProfession,
	deleteProfession,
} from "../controllers/professionProfileController";

const router = express.Router();

router.get("/", getProfessions);
router.get("/:id", getProfessionById);
router.post("/create", protect, professional, createProfession);
router.put("/update/:id", protect, professional, updateProfession);
router.delete("/delete/:id", protect, professional, deleteProfession);

export default router;
