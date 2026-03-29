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
router.post('/like/:id', validateObjectId(), protect, likePost);
router.post('/comment/:id', validateObjectId(), protect, addComment);
router.put('/:id', validateObjectId(), protect, updatePost);

// Specific DELETE routes must be defined before the wildcard /:id
router.delete('/:id/likes', validateObjectId(), protect, unlikePost);
router.delete(
    '/:postId/comments/:commentId',
    validateObjectId('postId'),
    validateObjectId('commentId'),
    protect,
    removeComment
);

// Generic wildcard — must remain last among DELETE routes
router.delete('/:id', validateObjectId(), protect, deletePost);

export default router;
