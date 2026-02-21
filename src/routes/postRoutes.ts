import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
    getPosts,
    getPostById,
    createPost,
    updatePost,
    likePost,
    unlikePost,
    addComment,
    removeComment,
    deletePost,
} from '../controllers/postControllers.js';

const router = express.Router();

router.get('/', getPosts);
router.get('/:id', getPostById);
router.post('/', protect, createPost);
router.post('/like/:id', protect, likePost);
router.post('/unlike/:id', protect, unlikePost);
router.post('/comment/:id', protect, addComment);
router.put('/:id', protect, updatePost);
router.delete('/:id', protect, deletePost);

// Phase 1: DELETE comment route (C1)
router.delete('/:postId/comments/:commentId', protect, removeComment);

// BUG-2: DELETE /unlike/:id — frontend calls DELETE /posts/unlike/:id
router.delete('/unlike/:id', protect, unlikePost);

// Phase 1: DELETE method for unlike (C2) — frontend also supports DELETE /posts/:id/likes
router.delete('/:id/likes', protect, unlikePost);

export default router;
