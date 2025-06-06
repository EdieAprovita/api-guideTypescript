import express from "express";
import { protect } from "../middleware/authMiddleware";
import {
	getPosts,
	getPostById,
	createPost,
	updatePost,
	likePost,
	unlikePost,
	addComment,
	deletePost,
} from "../controllers/postControllers";

const router = express.Router();

router.get("/", getPosts);
router.get("/:id", getPostById);
router.post("/", protect, createPost);
router.post("/like/:id", protect, likePost);
router.post("/unlike/:id", protect, unlikePost);
router.post("/comment/:id", protect, addComment);
router.put("/:id", protect, updatePost);
router.delete("/:id", protect, deletePost);

export default router;
