import express from "express";
import { protect, professional, admin } from "../middleware/authMiddleware";
import {
	getProfessionsProfile,
	getProfessionProfileById,
	createProfessionProfile,
	updateProfessionProfile,
	deleteProfessionProfile,
} from "../controllers/professionProfileController";

const router = express.Router();

router.get("/", getProfessionsProfile);
router.get("/:id", getProfessionProfileById);
router.post("/create", protect, professional, createProfessionProfile);
router.put("/update/:id", protect, professional, admin, updateProfessionProfile);
router.delete("/delete/:id", protect, professional, admin, deleteProfessionProfile);

export default router;
