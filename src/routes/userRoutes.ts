import express from "express";
import { protect, admin } from "../middleware/authMiddleware";
import {
	registerUser,
	loginUser,
	getUsers,
	getUserById,
	updateUserProfile,
	updateUserByAdmin,
	deleteUserByAdmin,
} from "../controllers/userControllers";

const router = express.Router();

router.get("/", protect, admin, getUsers);
router.get("/:id", protect, getUserById);
router.post("/login", loginUser);
router.post("/register", registerUser);
router.put("/profile/:id", protect, updateUserProfile);
router.put("/:id", protect, admin, updateUserByAdmin);
router.delete("/:id", protect, admin, deleteUserByAdmin);


export default router;
