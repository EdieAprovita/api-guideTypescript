import express from 'express';
import Joi from 'joi';
import { protect, admin } from '../middleware/authMiddleware';
import { validate, sanitizeInput, rateLimits, securityHeaders, validateInputLength } from '../middleware/validation';
import { userSchemas, paramSchemas, querySchemas, commonSchemas } from '../utils/validators';
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

// Apply security headers to all routes
router.use(securityHeaders);

// Apply input sanitization to all routes
router.use(...sanitizeInput());

// Routes with validation and rate limiting
router.get('/', 
    rateLimits.api, 
    protect, 
    admin, 
    validate({ query: querySchemas.search }), 
    getUsers
);

router.get('/profile', 
    rateLimits.api, 
    protect, 
    getCurrentUserProfile
);

router.post('/login', 
    rateLimits.auth,
    validateInputLength(1024), // 1KB limit for login
    validate({ body: userSchemas.login }), 
    loginUser
);

router.post('/register', 
    rateLimits.register,
    validateInputLength(2048), // 2KB limit for registration
    validate({ body: userSchemas.register }), 
    registerUser
);

router.post('/forgot-password', 
    rateLimits.auth,
    validateInputLength(512), // 512B limit for email
    validate({ 
        body: Joi.object({
            email: commonSchemas.email.required()
        })
    }), 
    forgotPassword
);

router.post('/logout', 
    rateLimits.api, 
    logout
);

router.put('/reset-password', 
    rateLimits.auth,
    validateInputLength(1024),
    validate({ 
        body: Joi.object({
            token: Joi.string().required(),
            password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
        })
    }), 
    resetPassword
);

router.put('/profile/:id', 
    rateLimits.api,
    validateInputLength(4096), // 4KB limit for profile updates
    protect, 
    validate({ 
        params: paramSchemas.id,
        body: userSchemas.updateProfile 
    }), 
    updateUserProfile
);

router.get('/:id', 
    rateLimits.api, 
    protect, 
    validate({ params: paramSchemas.id }), 
    getUserById
);

router.delete('/:id', 
    rateLimits.api, 
    protect, 
    admin, 
    validate({ params: paramSchemas.id }), 
    deleteUserById
);

export default router;
