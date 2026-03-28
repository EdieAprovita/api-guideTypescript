import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import UserServices from '../services/UserService.js';
import { HttpError, HttpStatusCode } from '../types/Errors.js';
import { getErrorMessage } from '../types/modalTypes.js';
import { sanitizeNoSQLInput } from '../utils/sanitizer.js';
import logger from '../utils/logger.js';
import { User } from '../models/User.js';
import type { UserRole } from '../models/User.js';
import { REGISTER_ALLOWED_ROLES, ROLE_RANK } from '../constants/roles.js';
import { getRefreshTokenCookieOptions } from '../constants/cookies.js';

function setRefreshTokenCookie(res: Response, refreshToken: string): void {
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());
}

/**
 * @description Register a new user
 * @name registerUser
 * @route POST /api/users
 * @access Public
 * @returns {Promise<Response>}
 */

// Security: whitelist the roles a user may self-assign on registration.
// 'professional' is intentionally self-assignable — users declare their own role at sign-up
// with no vetting required. If an approval workflow is introduced later, remove 'professional'
// from this list and handle it via a separate /users/:id/upgrade-role endpoint.
// 'admin' and any unknown role are rejected by Joi (400) before reaching this controller;
// this check is defense-in-depth for callers that bypass the validation layer.
// Constant lives in src/constants/roles.ts — shared with validators.ts.

export const registerUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sanitizedData = sanitizeNoSQLInput(req.body);
        const { role: requestedRole, ...restData } = sanitizedData;
        const safeData = REGISTER_ALLOWED_ROLES.includes(requestedRole as (typeof REGISTER_ALLOWED_ROLES)[number])
            ? { ...restData, role: requestedRole }
            : restData; // defaults to 'user' via User model
        const { refreshToken, ...data } = await UserServices.registerUser(safeData);
        setRefreshTokenCookie(res, refreshToken);
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data,
        });
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
 * @description Authenticate user and get token
 * @name loginUser
 * @route POST /api/users/login
 * @access Public
 * @returns {Promise<Response>}
 */

export const loginUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sanitizedData = sanitizeNoSQLInput(req.body);
        const { email, password } = sanitizedData;
        const { refreshToken, ...data } = await UserServices.loginUser(email, password);
        setRefreshTokenCookie(res, refreshToken);
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data,
        });
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

        // Validate token before using it
        if (!token || typeof token !== 'string') {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Reset token is required');
        }

        // Accept both 'newPassword' (legacy) and 'password' (frontend field name)
        const resolvedPassword = newPassword ?? password;
        // Reject undefined or non-string values.
        // NOTE: no .trim() — passwords are space-sensitive credentials.
        if (!resolvedPassword || typeof resolvedPassword !== 'string') {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Password is required');
        }

        const response = await UserServices.resetPassword(token, resolvedPassword);
        res.status(200).json(response);
    } catch (error) {
        if (error instanceof HttpError) return next(error);
        next(
            new HttpError(
                HttpStatusCode.BAD_REQUEST,
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
                HttpStatusCode.INTERNAL_SERVER_ERROR,
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
        if (error instanceof HttpError) {
            return next(error);
        }
        next(
            new HttpError(
                HttpStatusCode.INTERNAL_SERVER_ERROR,
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

export const getCurrentUserProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'User not authenticated');
        }

        const user = await UserServices.findUserById(userId);
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

export const updateUserProfile = asyncHandler(async (req: Request, res: Response) => {
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

    // Security: strip role from user input to prevent privilege escalation via profile updates.
    // Even if an admin is updating a profile, role changes should ideally happen via a dedicated endpoint,
    // but stripping it here guarantees users cannot self-promote.
    const { role: _stripRole, ...safeData } = sanitizedData;

    const updatedUser = await UserServices.updateUserById(targetUserId, safeData);
    res.json(updatedUser);
});

/**
 * @description Update user role
 * @name updateUserRole
 * @route PATCH /api/users/profile/:id/role
 * @access Private/Admin
 * @returns {Promise<Response>}
 */
export const updateUserRole = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const role = req.body?.role;

    if (!role) {
        throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Role is required');
    }

    try {
        const sanitizedUpdate = sanitizeNoSQLInput({ role });

        // Fetch previous role for audit trail.
        // Known limitation: there is a TOCTOU window between findById and updateUserById —
        // a concurrent role-change request could alter the role between these two calls,
        // making previousRole inaccurate in the audit log. The write itself is still correct.
        // An atomic fix (findOneAndUpdate with returnDocument:'before') would bypass Mongoose
        // middleware (see User.ts note), so the current two-step approach is intentional.
        const previousUser = await User.findById(id);
        if (!previousUser) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, 'User not found');
        }

        const previousRole = previousUser.role;
        // id! — non-null assertion: req.params.id is guaranteed by the router pattern /:id
        const updatedUser = await UserServices.updateUserById(id!, sanitizedUpdate);

        // High-value security event logging.
        // ROLE_RANK lives in src/constants/roles.ts — evaluated once at module load, not per-request.
        // action distinguishes escalations, demotions, and no-ops for accurate SIEM filtering.
        if (!(previousRole in ROLE_RANK)) {
            logger.warn('updateUserRole: unrecognised previousRole value — role rank defaulting to 0', {
                previousRole,
                targetId: id,
            });
        }
        if (!(role in ROLE_RANK)) {
            logger.warn('updateUserRole: unrecognised newRole value — role rank defaulting to 0', {
                role,
                targetId: id,
            });
        }
        // role is validated by Joi as UserRole before reaching this point — cast is safe.
        const prevRank = ROLE_RANK[previousRole as UserRole] ?? 0;
        const newRank = ROLE_RANK[role as UserRole] ?? 0;
        const action = newRank > prevRank ? 'role_escalation' : newRank < prevRank ? 'role_demotion' : 'role_unchanged';
        logger.info('User role updated', {
            adminId: req.user?._id,
            targetId: id,
            previousRole,
            newRole: role,
            action,
        });

        res.json(updatedUser);
    } catch (error) {
        if (error instanceof HttpError) {
            return next(error);
        }
        return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Invalid user ID or update data'));
    }
});

/**
 * @description Delete user
 * @name deleteUser
 * @route DELETE /api/users/:id
 * @access Private/Admin
 * @returns {Promise<Response>}
 * */

/**
 * @description Update push subscription for the authenticated user
 * @name updatePushSubscription
 * @route PUT /api/users/push-subscription
 * @access Private
 * @returns {Promise<Response>}
 */
export const updatePushSubscription = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id?.toString();
    if (!userId) {
        throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'User not found');
    }
    const sanitized = sanitizeNoSQLInput(req.body);
    const { subscription, settings } = sanitized;
    const user = await UserServices.updatePushSubscription(userId, subscription, settings);
    res.status(200).json({
        success: true,
        message: 'Push subscription updated',
        data: {
            pushSubscription: user.pushSubscription ? { endpoint: user.pushSubscription.endpoint } : undefined,
            notificationSettings: user.notificationSettings,
        },
    });
});

/**
 * @description Update notification settings for the authenticated user
 * @name updateNotificationSettings
 * @route PUT /api/users/push-settings
 * @access Private
 * @returns {Promise<Response>}
 */
/**
 * @description Delete push subscription for the authenticated user
 * @name deletePushSubscription
 * @route DELETE /api/users/push-subscription
 * @access Private
 */
export const deletePushSubscription = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id?.toString();
    if (!userId) {
        throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'User not found');
    }
    await UserServices.deletePushSubscription(userId);
    res.status(200).json({
        success: true,
        message: 'Push subscription deleted',
    });
});

/**
 * @description Update notification settings for the authenticated user
 * @name updateNotificationSettings
 * @route PUT /api/users/push-settings
 * @access Private
 */
export const updateNotificationSettings = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id?.toString();
    if (!userId) {
        throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'User not found');
    }
    const sanitized = sanitizeNoSQLInput(req.body);
    const { enabled, newRestaurants, newRecipes, communityUpdates, healthTips, promotions } = sanitized;
    const user = await UserServices.updateNotificationSettings(userId, {
        enabled,
        newRestaurants,
        newRecipes,
        communityUpdates,
        healthTips,
        promotions,
    });
    res.status(200).json({
        success: true,
        message: 'Notification settings updated',
        data: { notificationSettings: user.notificationSettings },
    });
});

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
