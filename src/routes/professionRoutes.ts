import express from "express";
import { protect, isOwnerOrAdmin, professional } from "../middleware/authMiddleware";
import {
	getProfessions,
	getProfessionById,
	createProfession,
	updateProfession,
	deleteProfession,
} from "../controllers/professionController";

const router = express.Router();

router.get("/", getProfessions);
router.get("/:id", getProfessionById);
router.post("/create", protect, professional, createProfession);
router.put("/update/:id", protect, isOwnerOrAdmin, updateProfession);
router.delete("/delete/:id", protect, isOwnerOrAdmin, deleteProfession);

export default router;
