import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/asyncHandler';
import UserServices from '../services/UserService';
import { HttpError, HttpStatusCode } from '../types/Errors';
import { getErrorMessage } from '../types/modalTypes';

/**
 * @description Authenticate user and get token
 * @name authUser
 * @route POST /api/users/login
 * @access Public
 */

export const registerUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await UserServices.registerUser(req.body, res);
        res.status(201).json(result);
    } catch (error) {
        // Log error details in test environment for debugging
        if (process.env.NODE_ENV === 'test') {
            console.error('registerUser controller error:', error);
        }

        const statusCode = error instanceof HttpError ? error.statusCode : HttpStatusCode.BAD_REQUEST;
        next(new HttpError(statusCode, getErrorMessage(error instanceof Error ? error.message : 'Unknown error')));
    }
});

/**
 * @description Register a new user
 * @name registerUser
 * @route POST /api/users
 * @access Public
 * @returns {Promise<Response>}
 */

export const loginUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
        const result = await UserServices.loginUser(email, password, res);
        res.status(200).json(result);
    } catch (error) {
        // Log error details in test environment for debugging
        if (process.env.NODE_ENV === 'test') {
            console.error('loginUser controller error:', error);
        }

        const statusCode = error instanceof HttpError ? error.statusCode : HttpStatusCode.UNAUTHORIZED;
        next(new HttpError(statusCode, getErrorMessage(error instanceof Error ? error.message : 'Unknown error')));
    }
});

/**
 * @description Forgot password
 * @name forgotPassword
 * @route POST /api/users/forgot-password
 * @access Private
 * @returns {Promise<Response>}
 */

export const forgotPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;
        const response = await UserServices.forgotPassword(email);
        res.status(200).json(response);
    } catch (error) {
        next(
            new HttpError(
                HttpStatusCode.BAD_REQUEST,
                getErrorMessage(error instanceof Error ? error.message : 'Unknown error')
            )
        );
    }
});

/**
 * @description Reset password
 * @name resetPassword
 * @route POST /api/users/reset-password
 * @access Private
 * @returns {Promise<Response>}
 */

export const resetPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token, newPassword } = req.body;
        const response = await UserServices.resetPassword(token, newPassword);
        res.status(200).json(response);
    } catch (error) {
        next(
            new HttpError(
                HttpStatusCode.BAD_REQUEST,
                getErrorMessage(error instanceof Error ? error.message : 'Unknown error')
            )
        );
    }
});

/**
 * @description Logout user
 * @name logout
 * @route POST /api/users/logout
 * @access Private
 * @returns {Promise<Response>}
 */

export const logout = asyncHandler(async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const response = await UserServices.logoutUser(res);
        res.status(200).json(response);
    } catch (error) {
        next(
            new HttpError(
                HttpStatusCode.INTERNAL_SERVER_ERROR,
                getErrorMessage(error instanceof Error ? error.message : 'Unknown error')
            )
        );
    }
});

/**
 * @description Get all users
 * @name getUsers
 * @route GET /api/users
 * @access Private/Admin
 * @returns {Promise<Response>}
 * */

export const getUsers = asyncHandler(async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await UserServices.findAllUsers();
        res.status(200).json(users);
    } catch (error) {
        next(
            new HttpError(
                HttpStatusCode.NOT_FOUND,
                getErrorMessage(error instanceof Error ? error.message : 'Unknown error')
            )
        );
    }
});

/**
 * @description Get single user by Id
 * @name getUser
 * @route GET /api/users/:id
 * @access Private/Admin
 * @returns {Promise<Response>}
 * */

export const getUserById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'User ID is required'));
        }
        const user = await UserServices.findUserById(id);
        res.status(200).json(user);
    } catch (error) {
        next(
            new HttpError(
                HttpStatusCode.NOT_FOUND,
                getErrorMessage(error instanceof Error ? error.message : 'Unknown error')
            )
        );
    }
});

/**
 * @description Get current user profile
 * @name getCurrentUserProfile
 * @route GET /api/users/profile
 * @access Private
 * @returns {Promise<Response>}
 */

// Helper function to log debug information in test environment
const logDebugInfo = (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === 'test') {
        console.log(`🔍 getCurrentUserProfile Debug: ${message}`, data);
    }
};

// Helper function to handle user lookup
const handleUserLookup = async (userId: string) => {
    logDebugInfo('Looking up user with ID:', userId);
    logDebugInfo('userId type:', typeof userId);

    const user = await UserServices.findUserById(userId);

    logDebugInfo('User lookup result:', user ? 'found' : 'not found');
    if (user) {
        logDebugInfo('Found user ID:', user._id);
        logDebugInfo('Found user email:', user.email);
    }

    return user;
};

export const getCurrentUserProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        logDebugInfo('req.user:', req.user);
        logDebugInfo('req.user?._id:', req.user?._id);
        logDebugInfo('typeof req.user?._id:', typeof req.user?._id);

        const userId = req.user?._id;
        if (!userId) {
            throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'User not authenticated');
        }

        const user = await handleUserLookup(userId);
        if (!user) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, 'User not found');
        }

        res.status(200).json(user);
    } catch (error) {
        if (process.env.NODE_ENV === 'test') {
            console.error('getCurrentUserProfile controller error:', error);
        }

        next(
            new HttpError(
                error instanceof HttpError ? error.statusCode : HttpStatusCode.INTERNAL_SERVER_ERROR,
                getErrorMessage(error instanceof Error ? error.message : 'Unknown error')
            )
        );
    }
});

/**
 * @description Update user profile
 * @name updateUserProfile
 * @route PUT /api/users/profile
 * @access Private
 * @returns {Promise<Response>}
 */

export const updateUserProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user?._id?.toString();
        const currentUserRole = req.user?.role;

        if (!currentUserId) {
            throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'User not found');
        }

        // Use the ID from params if provided, otherwise use current user ID
        const targetUserId = id || currentUserId;

        // Check authorization: users can only update their own profile, admins can update any profile
        if (targetUserId !== currentUserId && currentUserRole !== 'admin') {
            throw new HttpError(HttpStatusCode.FORBIDDEN, 'You can only update your own profile');
        }

        const updatedUser = await UserServices.updateUserById(targetUserId, req.body);
        res.json(updatedUser);
    } catch (error) {
        next(
            new HttpError(
                HttpStatusCode.INTERNAL_SERVER_ERROR,
                getErrorMessage(error instanceof Error ? error.message : 'Unknown error')
            )
        );
    }
});

/**
 * @description Delete user
 * @name deleteUser
 * @route DELETE /api/users/:id
 * @access Private/Admin
 * @returns {Promise<Response>}
 * */

export const deleteUserById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'User ID is required'));
        }
        const message = await UserServices.deleteUserById(id);
        if (!message) throw new HttpError(HttpStatusCode.NOT_FOUND, 'User not found');
        res.json(message);
    } catch (error) {
        next(
            new HttpError(
                HttpStatusCode.INTERNAL_SERVER_ERROR,
                getErrorMessage(error instanceof Error ? error.message : 'Unknown error')
            )
        );
    }
});
