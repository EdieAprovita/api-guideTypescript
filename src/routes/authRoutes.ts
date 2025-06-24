import express from 'express';
import { refreshToken, revokeAllTokens, logout } from '../middleware/authMiddleware';

const router = express.Router();

// Refresh token endpoint
router.post('/refresh-token', refreshToken);

// Logout endpoint (blacklist current token)
router.post('/logout', logout, (_req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully',
    });
});

// Revoke all tokens (logout from all devices)
router.post('/revoke-all-tokens', revokeAllTokens);

export default router;
