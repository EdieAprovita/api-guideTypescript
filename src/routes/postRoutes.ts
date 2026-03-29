import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { validateObjectId } from '../middleware/validation.js';
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
router.get('/:id', validateObjectId(), getPostById);
router.post('/', protect, createPost);
router.post('/like/:id', protect, validateObjectId(), likePost);
router.post('/comment/:id', protect, validateObjectId(), addComment);
router.put('/:id', protect, validateObjectId(), updatePost);

// Specific DELETE routes must be defined before the wildcard /:id
router.delete('/:id/likes', protect, validateObjectId(), unlikePost);
router.delete(
    '/:postId/comments/:commentId',
    protect,
    validateObjectId('postId'),
    validateObjectId('commentId'),
    removeComment
);

// Generic wildcard — must remain last among DELETE routes
router.delete('/:id', protect, validateObjectId(), deletePost);

export default router;
