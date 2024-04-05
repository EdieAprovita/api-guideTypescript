import express from "express";
import { protect, admin } from "../middleware/authMiddleware";
import {
	registerUser,
	loginUser,
	forgotPassword,
	resetPassword,
	getUsers,
	getUserById,
	updateUserProfile,
	deleteUserById,
} from "../controllers/userControllers";

const router = express.Router();

router.get("/", protect, admin, getUsers);
router.get("/:id", protect, getUserById);
router.post("/login", loginUser);
router.post("/register", registerUser);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password", resetPassword);
router.put("/profile/:id", protect, updateUserProfile);
router.delete("/:id", protect, admin, deleteUserById);

export default router;
