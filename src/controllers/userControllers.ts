import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import UserServices from '../services/UserService.js';
import { HttpError, HttpStatusCode } from '../types/Errors.js';
import { getErrorMessage } from '../types/modalTypes.js';
import { sanitizeNoSQLInput } from '../utils/sanitizer.js';

/**
 * @description Authenticate user and get token
 * @name authUser
 * @route POST /api/users/login
 * @access Public
 */

export const registerUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sanitizedData = sanitizeNoSQLInput(req.body);
        const result = await UserServices.registerUser(sanitizedData, res);
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
        const sanitizedData = sanitizeNoSQLInput(req.body);
        const { email, password } = sanitizedData;
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
        const sanitizedData = sanitizeNoSQLInput(req.body);
        const { email } = sanitizedData;
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
        const sanitizedData = sanitizeNoSQLInput(req.body);
        const { token, newPassword, password } = sanitizedData;

        // Bug fix (PR review): validate token before using it
        if (!token || typeof token !== 'string' || token.trim() === '') {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Reset token is required');
        }

        // Accept both 'newPassword' (legacy) and 'password' (frontend field name)
        const resolvedPassword = newPassword ?? password;
        // Reject undefined OR empty strings
        if (!resolvedPassword || typeof resolvedPassword !== 'string' || resolvedPassword.trim() === '') {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Password is required');
        }

        const response = await UserServices.resetPassword(token, resolvedPassword);
        res.status(200).json(response);
    } catch (error) {
        next(
            new HttpError(
                error instanceof HttpError ? error.statusCode : HttpStatusCode.BAD_REQUEST,
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
const logDebugInfo = (_message: string, _data?: unknown) => {
    // Debug logging disabled to reduce test output noise
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

        const sanitizedData = sanitizeNoSQLInput(req.body);
        const updatedUser = await UserServices.updateUserById(targetUserId, sanitizedData);
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
