import express from "express";
import { protect, admin } from "../middleware/authMiddleware";
import {
	getBusinesses,
	getBusinessById,
	createBusiness,
	updateBusiness,
	addReviewToBusiness,
	deleteBusiness,
} from "../controllers/businessControllers";

const router = express.Router();

router.get("/", getBusinesses);
router.get("/:id", getBusinessById);
router.post("/create", protect, createBusiness);
router.post("/add-review/:id", protect, addReviewToBusiness);
router.put("/update/:id", protect, admin, updateBusiness);
router.delete("/delete/:id", protect, admin, deleteBusiness);

export default router;
