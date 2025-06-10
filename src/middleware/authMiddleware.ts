import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError, HttpStatusCode } from '../types/Errors';
import { User } from '../models/User';
import { errorHandler } from './errorHandler';

/**
 * @description Protect routes
 * @name protect
 * @returns {Promise<void>}
 */

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies.jwt;

        if (!token) {
            throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'Not authorized to access this route');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
            userId: string;
        };
        const currentUser = await User.findById(decoded.userId).select('-password');

        if (!currentUser) {
            throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'User not found');
        }

        req.user = currentUser;
        next();
    } catch (error) {
        errorHandler(error instanceof Error ? error : new Error('Unknown error'), req, res, next);
    }
};

/**
 * @description Check if user is admin
 * @name isAdmin
 * @returns {Promise<void>}
 */

export const admin = (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role === 'admin') {
        next();
    } else {
        res.status(403).json({
            message: 'Forbidden',
            success: false,
            error: 'You are not an admin',
        });
    }
};

/**
 * @description Check if user is professional
 * @name professional
 * @returns {Promise<void>}
 */

export const professional = (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role === 'professional') {
        next();
    } else {
        res.status(403).json({
            message: 'Forbidden',
            success: false,
            error: 'You are not a professional',
        });
    }
};
