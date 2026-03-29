import { Request, Response, NextFunction } from 'express';
import { HttpError, HttpStatusCode, TokenRevokedError } from '../types/Errors.js';
import logger from '../utils/logger.js';
import { User } from '../models/User.js';
import TokenService from '../services/TokenService.js';
import { getRefreshTokenCookieOptions } from '../constants/cookies.js';

// Define interface for authenticated user
interface AuthenticatedUser {
    _id: string;
    email: string;
    role: 'user' | 'professional' | 'admin';
    isActive: boolean;
}

// Extend Express Request interface
declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
        }
    }
}

// Helper function to extract token from request.
// cookie-parser is mounted globally (app.ts) so req.cookies is always populated —
// raw req.headers.cookie parsing is not needed and would have a base64 padding bug.
const extractToken = (req: Request): string | undefined => {
    if (req.cookies?.jwt) {
        return req.cookies.jwt;
    }

    if (req.headers.authorization?.startsWith('Bearer')) {
        return req.headers.authorization.split(' ')[1];
    }

    return undefined;
};

// Helper function to create test user object
const createTestUser = (payload: any): AuthenticatedUser => ({
    _id: payload.userId,
    email: payload.email,
    role: payload.role || 'user',
    isActive: true,
});

// Helper function to handle test environment user setup
const handleTestEnvironment = (payload: any, req: Request): boolean => {
    if (process.env.NODE_ENV !== 'test' || process.env.BYPASS_AUTH_FOR_TESTING !== 'true') {
        return false;
    }

    req.user = createTestUser(payload);

    return true;
};

// Helper function to verify token and get payload
const verifyTokenAndGetPayload = async (token: string) => {
    try {
        const payload = await TokenService.verifyAccessToken(token);

        return payload;
    } catch (error: unknown) {
        if (error instanceof TokenRevokedError) {
            throw error; // let protect's next(error) propagate it to errorHandler
        }
        throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'Invalid or expired token');
    }
};

// Helper function to validate user account
const validateUserAccount = async (userId: string) => {
    // Fail-closed: if Redis is unavailable we cannot confirm revocation state,
    // so we reject the request rather than risk accepting a revoked session.
    try {
        const areTokensRevoked = await TokenService.isUserTokensRevoked(userId);
        if (areTokensRevoked) {
            throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'User session has been revoked');
        }
    } catch (error) {
        if (error instanceof HttpError) throw error;
        logger.error('Redis unavailable during token revocation check — denying request', { userId, error });
        throw new HttpError(HttpStatusCode.SERVICE_UNAVAILABLE, 'Authentication service temporarily unavailable');
    }

    const currentUser = await User.findById(userId).select('-password').exec();
    if (!currentUser) {
        throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'User not found');
    }

    if (currentUser.isDeleted || !currentUser.isActive) {
        throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'User account is inactive');
    }

    return currentUser;
};

/**
 * @description Protect routes
 * @name protect
 * @returns {Promise<void>}
 */

export const protect = async (req: Request, _res: Response, next: NextFunction) => {
    try {
        const token = extractToken(req);
        if (!token) {
            throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'Not authorized to access this route');
        }

        const payload = await verifyTokenAndGetPayload(token);
        if (!payload) {
            throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'Invalid token payload');
        }

        // Handle test environment
        if (handleTestEnvironment(payload, req)) {
            return next();
        }

        // Validate user account for production
        const currentUser = await validateUserAccount(payload.userId);
        req.user = currentUser;
        return next();
    } catch (error) {
        return next(error);
    }
};

/**
 * @description Common authentication check middleware
 * @name requireAuth
 * @returns {Function}
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({
            message: 'Unauthorized',
            success: false,
            error: 'User not authenticated',
        });
    }
    return next();
};

/**
 * @description Check if user is admin
 * @name admin
 * @returns {Promise<void>}
 */
export const admin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({
            message: 'Unauthorized',
            success: false,
            error: 'User not authenticated',
        });
    }

    if (req.user.role === 'admin') {
        return next();
    } else {
        return res.status(403).json({
            message: 'Forbidden',
            success: false,
            error: 'Admin access required',
        });
    }
};

/**
 * @description Check if user is professional
 * @name professional
 * @returns {Promise<void>}
 */
export const professional = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({
            message: 'Unauthorized',
            success: false,
            error: 'User not authenticated',
        });
    }

    if (req.user.role === 'professional') {
        return next();
    } else {
        return res.status(403).json({
            message: 'Forbidden',
            success: false,
            error: 'Professional access required',
        });
    }
};

/**
 * Middleware factory that enforces resource ownership.
 * Admins bypass the check; regular users must own the resource
 * (i.e. `req.params.id` must equal their own user ID).
 *
 * Deny-by-default: if ownership cannot be confirmed, the request is rejected.
 */
export const checkOwnership = () => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                message: 'Unauthorized',
                success: false,
                error: 'User not authenticated',
            });
        }

        // Admins can access any resource
        if (req.user.role === 'admin') {
            return next();
        }

        const resourceId = req.params.id;
        const userId = req.user._id?.toString();

        // Allow if the user is accessing their own resource
        if (resourceId && userId && resourceId === userId) {
            return next();
        }

        // Deny-by-default: ownership could not be confirmed
        return res.status(403).json({
            message: 'Forbidden',
            success: false,
            error: 'You do not have permission to access this resource',
        });
    };
};

/**
 * @description Logout and blacklist current token.
 * Session model: JWTs are stateless but backed by a Redis blacklist for server-side revocation.
 * This is the single logout path — POST /auth/logout (requires protect middleware).
 * The legacy POST /users/logout was removed as it was a redundant alias without auth guard.
 * @name logout
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let token: string | undefined;

        // cookie-parser is mounted globally — req.cookies is always populated.
        // Raw req.headers.cookie parsing is intentionally absent: it is dead code
        // when cookie-parser is active and would introduce a base64-padding bug.
        if (req.cookies?.jwt) {
            token = req.cookies.jwt;
        } else if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (token) {
            // Blacklist the token so it cannot be reused until natural expiry.
            await TokenService.blacklistToken(token);
        }
        // If no token is present (client already cleared its cookie), skip blacklisting —
        // there is nothing to revoke. The cookie is still cleared below.

        // Clear cookie if it exists
        res.clearCookie('jwt', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
        });

        return next();
    } catch (error) {
        if (error instanceof Error) {
            return next(error);
        }
        logger.error('Error during logout', { error });
        return next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, 'Logout failed'));
    }
};

/**
 * @description Refresh access token using refresh token from body or HttpOnly cookie.
 * Security: New refresh token is returned in HttpOnly cookie (not in JSON body)
 * to prevent XSS attacks from stealing the refresh token.
 * @name refreshToken
 */
export const refreshToken = async (req: Request, res: Response) => {
    try {
        // Prefer HttpOnly cookie (secure) over body (legacy/initial auth)
        const refreshTokenValue = req.cookies?.refreshToken || req.body.refreshToken;

        if (!refreshTokenValue) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required',
            });
        }

        const tokens = await TokenService.refreshTokens(refreshTokenValue);

        // SECURITY: Send new refresh token in HttpOnly, Secure cookie (not in JSON body)
        // This prevents XSS attacks from stealing the refresh token via document.cookie
        res.cookie('refreshToken', tokens.refreshToken, getRefreshTokenCookieOptions());

        // Return ONLY the access token in response body
        // Refresh token is in secure cookie and NOT exposed to JavaScript
        return res.json({
            success: true,
            message: 'Tokens refreshed successfully',
            data: {
                accessToken: tokens.accessToken,
                // refreshToken is in HttpOnly cookie, deliberately omitted here
            },
        });
    } catch (error) {
        // Clear invalid refresh token cookie on error
        res.clearCookie('refreshToken');

        // Log detailed error server-side; return generic message to client
        logger.warn('Refresh token validation failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });

        return res.status(401).json({
            success: false,
            message: 'Invalid or expired refresh token',
        });
    }
};

/**
 * @description Revoke all user tokens (force logout from all devices)
 * @name revokeAllTokens
 */
export const revokeAllTokens = async (req: Request, res: Response) => {
    try {
        if (!req.user?._id) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
        }

        await TokenService.revokeAllUserTokens(req.user._id.toString());

        return res.json({
            success: true,
            message: 'All tokens revoked successfully',
        });
    } catch (error) {
        logger.error('Failed to revoke all tokens', { error });
        return res.status(500).json({
            success: false,
            message: 'Failed to revoke tokens',
        });
    }
};
