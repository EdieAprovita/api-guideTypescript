import express from "express";
import { protect, admin } from "../middleware/authMiddleware";
import {
	getSanctuaries,
	getSanctuaryById,
	createSanctuary,
	updateSanctuary,
	deleteSanctuary,
	addReviewToSanctuary,
} from "../controllers/sanctuaryControllers";

const router = express.Router();

router.get("/", getSanctuaries);
router.get("/:id", getSanctuaryById);
router.post("/create", protect, createSanctuary);
router.post("/add-review/:id", protect, addReviewToSanctuary);
router.put("/update/:id", protect, admin, updateSanctuary);
router.delete("/delete/:id", protect, admin, deleteSanctuary);

export default router;
