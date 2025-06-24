import express from 'express';
import { refreshToken, revokeAllTokens, logout } from '../middleware/authMiddleware';
import { validate, rateLimits, securityHeaders, validateInputLength } from '../middleware/validation';
import Joi from 'joi';

const router = express.Router();

// Apply security headers to all auth routes
router.use(securityHeaders);

// Refresh token endpoint
router.post('/refresh-token',
  rateLimits.auth,
  validateInputLength(512),
  validate({
    body: Joi.object({
      refreshToken: Joi.string().required()
    })
  }),
  refreshToken
);

// Logout endpoint (blacklist current token)
router.post('/logout',
  rateLimits.api,
  logout,
  (req, res) => {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  }
);

// Revoke all tokens (logout from all devices)
router.post('/revoke-all-tokens',
  rateLimits.auth,
  revokeAllTokens
);

export default router;