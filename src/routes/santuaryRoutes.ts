import express from "express";
import { protect, admin } from "../middleware/authMiddleware";
import {
	getSantuaries,
	getSantuaryById,
	createSantuary,
	updateSantuary,
	deleteSantuary,
	getReviews,
} from "../controllers/santuaryControllers";

const router = express.Router();

router.get("/", getSantuaries);
router.get("/:id", getSantuaryById);
router.post("/create", protect, createSantuary);
router.post("/add-review/:id", protect, getReviews);
router.put("/update/:id", protect, admin, updateSantuary);
router.delete("/delete/:id", protect, admin, deleteSantuary);

export default router;
