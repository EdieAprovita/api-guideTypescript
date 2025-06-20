import express from 'express';
import { protect, admin } from '../middleware/authMiddleware';
import {
    registerUser,
    loginUser,
    forgotPassword,
    resetPassword,
    getUsers,
    getUserById,
    updateUserProfile,
    getCurrentUserProfile,
    logout,
    deleteUserById,
} from '../controllers/userControllers';

const router = express.Router();

router.get('/', protect, admin, getUsers);
router.get('/profile', protect, getCurrentUserProfile);
router.post('/login', loginUser);
router.post('/register', registerUser);
router.post('/forgot-password', forgotPassword);
router.post('/logout', logout);
router.put('/reset-password', resetPassword);
router.put('/profile/:id', protect, updateUserProfile);
router.get('/:id', protect, getUserById);
router.delete('/:id', protect, admin, deleteUserById);

export default router;
