import express from "express";
import { protect, admin } from "../middleware/authMiddleware";
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
router.post("/create", protect, admin, createProfession);
router.put("/update/:id", protect, updateProfession);
router.delete("/delete/:id", protect, admin, deleteProfession);

export default router;
