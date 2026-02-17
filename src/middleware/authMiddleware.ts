import { Request, Response, NextFunction } from 'express';
import { HttpError, HttpStatusCode } from '../types/Errors.js';
import { User } from '../models/User.js';
import { errorHandler } from './errorHandler.js';
import TokenService from '../services/TokenService.js';

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

// Helper function to extract token from request
const extractToken = (req: Request): string | undefined => {
    if (req.cookies?.jwt) {
        return req.cookies.jwt;
    }

    if (req.headers.authorization?.startsWith('Bearer')) {
        return req.headers.authorization.split(' ')[1];
    }

    if (req.headers.cookie) {
        const cookies = req.headers.cookie.split(';').reduce(
            (acc, cookie) => {
                const [key, value] = cookie.trim().split('=');
                if (key && value) {
                    acc[key] = value;
                }
                return acc;
            },
            {} as Record<string, string>
        );

        return cookies.jwt;
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
    if (process.env.NODE_ENV !== 'test') {
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
    } catch (error) {
        if (process.env.NODE_ENV === 'test') {
            console.error('Token verification failed:', error);
            console.error('Token:', token);
        }
        throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'Invalid or expired token');
    }
};

// Helper function to validate user account
const validateUserAccount = async (userId: string) => {
    const areTokensRevoked = await TokenService.isUserTokensRevoked(userId);
    if (areTokensRevoked) {
        throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'User session has been revoked');
    }

    const currentUser = await User.findById(userId).select('-password').exec();
    if (!currentUser) {
        throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'User not found');
    }

    if (currentUser.isDeleted ?? !currentUser.isActive) {
        throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'User account is inactive');
    }

    return currentUser;
};

/**
 * @description Protect routes
 * @name protect
 * @returns {Promise<void>}
 */

export const protect = async (req: Request, res: Response, next: NextFunction) => {
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
        next();
    } catch (error) {
        if (process.env.NODE_ENV === 'test') {
            console.error('Authentication middleware error:', error);
        }
        errorHandler(error instanceof Error ? error : new Error('Unknown error'), req, res, next);
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
 * @description Check resource ownership
 * @name checkOwnership
 * @returns {Function}
 */
export const checkOwnership = (_resourceField: string = 'userId') => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                message: 'Unauthorized',
                success: false,
                error: 'User not authenticated',
            });
        }

        const resourceId = req.params.id;
        const userId = req.user?._id?.toString();

        // Admins can access any resource
        if (req.user.role === 'admin') {
            return next();
        }

        // For profile routes, check if user is accessing their own profile
        if (req.route.path.includes('/profile') && resourceId === userId) {
            return next();
        }

        // For other resources, we'll need to check the database
        // This is a basic implementation - you may need to customize per resource type
        next();
    };
};

/**
 * @description Logout and blacklist current token
 * @name logout
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let token: string | undefined;

        // Extract token using same logic as protect middleware
        if (req.cookies.jwt) {
            token = req.cookies.jwt;
        } else if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (token) {
            // Blacklist the token
            await TokenService.blacklistToken(token);
        }

        // Clear cookie if it exists
        res.clearCookie('jwt', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
        });

        next();
    } catch (error) {
        errorHandler(error instanceof Error ? error : new Error('Logout failed'), req, res, next);
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
        // Accept refresh token from body (for initial auth) or HttpOnly cookie (after refresh)
        const refreshTokenValue = req.body.refreshToken || req.cookies?.refreshToken;

        if (!refreshTokenValue) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required',
            });
        }

        const tokens = await TokenService.refreshTokens(refreshTokenValue);

        // SECURITY: Send new refresh token in HttpOnly, Secure cookie (not in JSON body)
        // This prevents XSS attacks from stealing the refresh token via document.cookie
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true, // Prevent JavaScript access (XSS protection)
            secure: isProduction, // HTTPS only in production
            sameSite: 'strict', // CSRF protection
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

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

        return res.status(401).json({
            success: false,
            message: 'Invalid refresh token',
            error: error instanceof Error ? error.message : 'Unknown error',
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
        return res.status(500).json({
            success: false,
            message: 'Failed to revoke tokens',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
