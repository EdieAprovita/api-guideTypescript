import express from "express";
import { protect, admin } from "../middleware/authMiddleware";
import {
	registerUser,
	loginUser,
	getUsers,
	getUserById,
} from "../controllers/userControllers";

const router = express.Router();

router.get("/", protect, admin, getUsers);
router.post("/login", loginUser);
router.post("/register", registerUser);
router.get("/:id", protect, getUserById);

export default router;
