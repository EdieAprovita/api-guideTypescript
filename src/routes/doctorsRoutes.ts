import express from "express";
import { admin, protect } from "../middleware/authMiddleware";
import {
	getDoctors,
	getDoctorById,
	createDoctor,
	updateDoctor,
	deleteDoctor,
} from "../controllers/doctorsControllers";

const router = express.Router();

router.get("/", getDoctors);
router.get("/:id", getDoctorById);
router.post("/create", protect, createDoctor);
router.put("/update/:id", protect, admin, updateDoctor);
router.delete("/delete/:id", protect, admin, deleteDoctor);

export default router;
