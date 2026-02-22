import express from 'express';
import Joi from 'joi';
import { protect, admin } from '../middleware/authMiddleware.js';
import { validate, rateLimits, validateInputLength } from '../middleware/validation.js';
import { userSchemas, paramSchemas, querySchemas, commonSchemas, createPasswordSchema } from '../utils/validators.js';
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
} from '../controllers/userControllers.js';

const router = express.Router();

// Routes with validation and rate limiting
router.get('/', rateLimits.api, protect, admin, validate({ query: querySchemas.search }), getUsers);

router.get('/profile', rateLimits.api, protect, getCurrentUserProfile);

router.put(
    '/profile',
    rateLimits.api,
    validateInputLength(4096), // 4KB limit for profile updates
    protect,
    validate({
        body: userSchemas.updateProfile,
    }),
    updateUserProfile
);

router.post(
    '/login',
    rateLimits.auth,
    validateInputLength(1024), // 1KB limit for login
    validate({ body: userSchemas.login }),
    loginUser
);

router.post(
    '/register',
    rateLimits.register,
    validateInputLength(2048), // 2KB limit for registration
    validate({ body: userSchemas.register }),
    registerUser
);

router.post(
    '/forgot-password',
    rateLimits.auth,
    validateInputLength(512), // 512B limit for email
    validate({
        body: Joi.object({
            email: commonSchemas.email.required(),
        }),
    }),
    forgotPassword
);

router.post('/logout', rateLimits.api, logout);

router.put(
    '/reset-password',
    rateLimits.auth,
    validateInputLength(1024),
    validate({
        body: Joi.object({
            token: Joi.string().required(),
            // Accept both 'password' (frontend) and 'newPassword' (legacy).
            // Without both here, stripUnknown discards whichever field the client sends,
            // causing "Password is required" even when a valid password was provided.
            password: createPasswordSchema().optional(),
            newPassword: createPasswordSchema().optional(),
        })
            // At least one of the two password fields must be present
            .or('password', 'newPassword')
            .messages({
                'object.missing': 'Either password or newPassword is required',
                'string.pattern.base':
                    'Password must contain at least one uppercase letter, one lowercase letter, and one number',
            }),
    }),
    resetPassword
);

router.put(
    '/profile/:id',
    rateLimits.api,
    validateInputLength(4096), // 4KB limit for profile updates
    protect,
    validate({
        params: paramSchemas.id,
        body: userSchemas.updateProfile,
    }),
    updateUserProfile
);

router.get('/:id', rateLimits.api, protect, admin, validate({ params: paramSchemas.id }), getUserById);

router.delete('/:id', rateLimits.api, protect, admin, validate({ params: paramSchemas.id }), deleteUserById);

export default router;
