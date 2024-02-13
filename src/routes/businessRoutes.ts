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

router.get("/business", getBusinesses);
router.get("/business/:id", getBusinessById);
router.post("/business", protect, createBusiness);
router.put("/business/:id", protect, updateBusiness);
router.delete("/business/:id", protect, admin, deleteBusiness);

export default router;
