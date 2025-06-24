import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError, HttpStatusCode } from '../types/Errors';
import { User } from '../models/User';
import { errorHandler } from './errorHandler';
import TokenService from '../services/TokenService';

/**
 * @description Protect routes
 * @name protect
 * @returns {Promise<void>}
 */

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let token: string | undefined;

        // Check for token in cookies first (existing behavior)
        if (req.cookies.jwt) {
            token = req.cookies.jwt;
        }
        // Check for token in Authorization header (Bearer token)
        else if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // Check for token in Cookie header (for cross-origin requests)
        else if (req.headers.cookie) {
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

            if (cookies.jwt) {
                token = cookies.jwt;
            }
        }

        if (!token) {
            throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'Not authorized to access this route');
        }

        // Use TokenService for enhanced security validation
        const payload = await TokenService.verifyAccessToken(token);
        
        // Check if user tokens have been revoked globally
        const areTokensRevoked = await TokenService.isUserTokensRevoked(payload.userId);
        if (areTokensRevoked) {
            throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'User session has been revoked');
        }

        const currentUser = await User.findById(payload.userId).select('-password');

        if (!currentUser) {
            throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'User not found');
        }

        // Check if user account is still active
        if (currentUser.isDeleted || !currentUser.isActive) {
            throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'User account is inactive');
        }

        req.user = currentUser;
        next();
    } catch (error) {
        errorHandler(error instanceof Error ? error : new Error('Unknown error'), req, res);
    }
};

/**
 * @description Check if user is admin
 * @name isAdmin
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
        next();
    } else {
        res.status(403).json({
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
        next();
    } else {
        res.status(403).json({
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
export const checkOwnership = (resourceField: string = 'userId') => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                message: 'Unauthorized',
                success: false,
                error: 'User not authenticated',
            });
        }

        const resourceId = req.params.id;
        const userId = req.user._id.toString();

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
            sameSite: 'strict'
        });

        next();
    } catch (error) {
        errorHandler(error instanceof Error ? error : new Error('Logout failed'), req, res);
    }
};

/**
 * @description Refresh access token using refresh token
 * @name refreshToken
 */
export const refreshToken = async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        const tokens = await TokenService.refreshTokens(refreshToken);

        res.json({
            success: true,
            message: 'Tokens refreshed successfully',
            data: tokens
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid refresh token',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * @description Revoke all user tokens (force logout from all devices)
 * @name revokeAllTokens
 */
export const revokeAllTokens = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        await TokenService.revokeAllUserTokens(req.user._id.toString());

        res.json({
            success: true,
            message: 'All tokens revoked successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to revoke tokens',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
