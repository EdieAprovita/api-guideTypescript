import express from 'express';
import { refreshToken, revokeAllTokens, logout, protect } from '../middleware/authMiddleware';
import { validate, rateLimits, validateInputLength } from '../middleware/validation';
import Joi from 'joi';

const router = express.Router();


// Refresh token endpoint
router.post(
    '/refresh-token',
    rateLimits.auth,
    validateInputLength(512),
    validate({
        body: Joi.object({
            refreshToken: Joi.string().required(),
        }),
    }),
    refreshToken
);

// Logout endpoint (blacklist current token)
router.post('/logout', rateLimits.api, protect, logout, (_req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully',
    });
});

// Revoke all tokens (logout from all devices)
router.post('/revoke-all-tokens', rateLimits.auth, protect, revokeAllTokens);

export default router;
