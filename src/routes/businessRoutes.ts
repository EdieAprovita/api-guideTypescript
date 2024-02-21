import express from "express";
import { protect, admin } from "../middleware/authMiddleware";
import {
	getBusinesses,
	getBusinessById,
	createBusiness,
	updateBusiness,
	deleteBusiness,
} from "../controllers/businessControllers";

const router = express.Router();

router.get("/", getBusinesses);
router.get("/:id", getBusinessById);
router.post("/create", protect, createBusiness);
router.put("/update/:id", protect, updateBusiness);
router.delete("/delete/:id", protect, admin, deleteBusiness);

export default router;
