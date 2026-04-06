import jwt, { JwtPayload } from 'jsonwebtoken';
import nodemailer from 'nodemailer';

import { User, IUser } from '../models/User.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { HttpError, HttpStatusCode, UserIdRequiredError } from '../types/Errors.js';
import { getErrorMessage } from '../types/modalTypes.js';
import TokenService from './TokenService.js';
import logger from '../utils/logger.js';

/**
 * Validates and sanitizes email input to prevent NoSQL injection attacks
 * @param email - The email to validate and sanitize
 * @returns The sanitized email
 * @throws HttpError if email is invalid
 */
function validateAndSanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
        throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid email format'));
    }

    // Sanitize email: remove any potential injection characters and validate format
    const sanitizedEmail = email.trim().toLowerCase();

    // Safer email validation without backtracking
    const atIndex = sanitizedEmail.indexOf('@');
    const dotIndex = sanitizedEmail.lastIndexOf('.');

    // Basic validation without regex
    if (
        atIndex === -1 ||
        atIndex === 0 ||
        dotIndex === -1 ||
        dotIndex <= atIndex + 1 ||
        dotIndex === sanitizedEmail.length - 1
    ) {
        throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid email format'));
    }

    // Check for valid characters only
    const validChars = /^[a-zA-Z0-9._%+@-]+$/;
    if (!validChars.test(sanitizedEmail)) {
        throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid email format'));
    }

    return sanitizedEmail;
}

abstract class BaseService {
    protected validateUserExists(user: IUser | null) {
        if (!user) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage('User not found'));
        }
    }

    protected async validateUserNotExists(email: string) {
        const sanitizedEmail = validateAndSanitizeEmail(email);
        const existingUser = await User.findOne({ email: sanitizedEmail }).exec();
        if (existingUser) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('User already exists'));
        }
    }

    protected async getUserByEmail(email: string) {
        const sanitizedEmail = validateAndSanitizeEmail(email);
        const user = await User.findOne({ email: sanitizedEmail }).select('+password').exec();
        this.validateUserExists(user);
        return user!;
    }

    protected async validateUserCredentials(user: IUser | null, password: string) {
        if (!user || !(await user.matchPassword(password))) {
            throw new HttpError(HttpStatusCode.UNAUTHORIZED, getErrorMessage('Invalid credentials'));
        }
    }

    protected async generateResetToken(user: IUser) {
        // Use a dedicated secret for password-reset tokens so that access tokens
        // and reset tokens are not interchangeable (defense-in-depth).
        const secret = process.env.JWT_RESET_SECRET ?? process.env.JWT_SECRET;
        if (!secret) {
            throw new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, 'JWT secret not configured');
        }
        return jwt.sign({ userId: user._id, purpose: 'password-reset' }, secret, {
            expiresIn: '1h',
        });
    }

    protected async sendPasswordResetEmail(email: string, resetToken: string) {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password reset request',
            text: `Click on the link to reset your password: ${process.env.CLIENT_URL}/reset-password/${resetToken}`,
        });
    }

    protected async getUserByResetToken(resetToken: string) {
        // Must match the secret used in generateResetToken
        const secret = process.env.JWT_RESET_SECRET ?? process.env.JWT_SECRET;
        if (!secret) {
            throw new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, 'JWT secret not configured');
        }
        const decoded = jwt.verify(resetToken, secret) as JwtPayload;

        // Verify this is actually a password-reset token, not a repurposed access token
        if (decoded.purpose !== 'password-reset') {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid reset token'));
        }

        const user = await User.findById(decoded.userId).exec();
        this.validateUserExists(user);
        return user!;
    }

    protected async updateUserPassword(user: IUser, newPassword: string) {
        // Assign plain password — the Mongoose pre('save') hook handles hashing
        user.password = newPassword;
        await user.save();
    }
}

class UserService extends BaseService {
    async registerUser(userData: Pick<IUser, 'username' | 'email' | 'password'>) {
        await this.validateUserNotExists(userData.email);
        const user = await User.create(userData);
        const tokens = await TokenService.generateTokens(user._id.toString(), user.email, user.role);

        return {
            ...this.getUserResponse(user),
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        };
    }

    async loginUser(email: string, password: string) {
        const sanitizedEmail = validateAndSanitizeEmail(email);
        const user = await User.findOne({ email: sanitizedEmail }).select('+password').exec();
        await this.validateUserCredentials(user, password);
        const tokens = await TokenService.generateTokens(user!._id.toString(), user!.email, user!.role);
        const userResponse = this.getUserResponse(user!);
        return {
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            ...userResponse,
        };
    }

    /**
     * Initiates a password reset flow for the given email address.
     *
     * @security OWASP A07:2021 - Identification and Authentication Failures
     * Always returns the same response regardless of whether the email exists
     * in the database. This prevents attackers from enumerating valid accounts
     * by observing different error responses.
     *
     * Real transport errors (SMTP failures) are logged server-side but never
     * surfaced to the client.
     *
     * @see https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/
     */
    async forgotPassword(email: string) {
        const SAFE_RESPONSE = { message: 'If that email exists, reset instructions have been sent' } as const;

        try {
            const sanitizedEmail = validateAndSanitizeEmail(email);
            const user = await User.findOne({ email: sanitizedEmail }).select('+password').exec();

            if (user) {
                const resetToken = await this.generateResetToken(user);
                await this.sendPasswordResetEmail(user.email, resetToken);
            }
            // If user is null we intentionally do nothing -- no error, no email.
        } catch (error) {
            // Log real infrastructure errors (SMTP, JWT config) for ops visibility,
            // but never leak them to the client.
            if (error instanceof HttpError && error.statusCode === HttpStatusCode.BAD_REQUEST) {
                // Invalid email format -- still return the safe generic response
                // so attackers cannot distinguish "bad format" from "not found".
            } else {
                logger.error('forgotPassword: unexpected error during reset flow', error);
            }
        }

        return SAFE_RESPONSE;
    }

    async resetPassword(resetToken: string, newPassword: string) {
        const user = await this.getUserByResetToken(resetToken);
        await this.updateUserPassword(user, newPassword);
        return { message: 'Password reset successful' };
    }

    async findAllUsers(params: {
        page: number;
        limit: number;
        search?: string;
        sortBy?: 'newest' | 'oldest' | 'username';
    }) {
        const { page, limit, search, sortBy } = params;
        const skip = (page - 1) * limit;

        const filter: Record<string, unknown> = {};
        if (search) {
            const escaped = escapeRegex(search);
            filter.$or = [
                { username: { $regex: escaped, $options: 'i' } },
                { email: { $regex: escaped, $options: 'i' } },
            ];
        }

        const sortMap: Record<NonNullable<typeof sortBy>, Record<string, 1 | -1>> = {
            newest: { createdAt: -1 },
            oldest: { createdAt: 1 },
            username: { username: 1 },
        };
        const sort = sortMap[sortBy ?? 'newest'];

        const [total, users] = await Promise.all([
            User.countDocuments(filter),
            User.find(filter).sort(sort).skip(skip).limit(limit).exec(),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            data: users.map(u => this.getUserResponse(u)),
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrevious: page > 1,
            },
        };
    }

    async findUserById(userId: string) {
        if (!userId) throw new UserIdRequiredError('User ID not found');
        const user = await User.findById(userId).exec();
        return user;
    }

    async updateUserById(userId: string, updateData: Partial<IUser>) {
        const user = await this.findUserById(userId);
        if (!user) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage('User not found'));
        }
        this.updateUserFields(user, updateData);
        return user.save();
    }

    async deleteUserById(userId: string) {
        const deleted = await User.findByIdAndDelete(userId).exec();
        if (!deleted) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, 'User not found');
        }
        return { message: 'User deleted successfully' };
    }

    async updatePushSubscription(
        userId: string,
        subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
        settings?: Partial<NonNullable<IUser['notificationSettings']>>
    ): Promise<IUser> {
        const user = await this.findUserById(userId);
        if (!user) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, 'User not found');
        }
        user.pushSubscription = subscription;
        if (settings) {
            user.notificationSettings = this.mergeNotificationSettings(settings, user.notificationSettings);
        }
        return user.save();
    }

    async deletePushSubscription(userId: string): Promise<IUser> {
        const user = await User.findByIdAndUpdate(userId, { $unset: { pushSubscription: 1 } }, { new: true });
        if (!user) throw new HttpError(HttpStatusCode.NOT_FOUND, 'User not found');
        return user;
    }

    async updateNotificationSettings(
        userId: string,
        settings: Partial<NonNullable<IUser['notificationSettings']>>
    ): Promise<IUser> {
        const user = await this.findUserById(userId);
        if (!user) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, 'User not found');
        }
        user.notificationSettings = this.mergeNotificationSettings(settings, user.notificationSettings);
        return user.save();
    }

    private mergeNotificationSettings(
        incoming: Partial<NonNullable<IUser['notificationSettings']>>,
        existing?: IUser['notificationSettings']
    ): NonNullable<IUser['notificationSettings']> {
        return {
            enabled: incoming.enabled ?? existing?.enabled ?? true,
            newRestaurants: incoming.newRestaurants ?? existing?.newRestaurants ?? true,
            newRecipes: incoming.newRecipes ?? existing?.newRecipes ?? true,
            communityUpdates: incoming.communityUpdates ?? existing?.communityUpdates ?? true,
            healthTips: incoming.healthTips ?? existing?.healthTips ?? false,
            promotions: incoming.promotions ?? existing?.promotions ?? false,
        };
    }

    private getUserResponse(user: IUser) {
        const { _id, username, email, role, photo } = user;
        return { _id, username, email, role, photo };
    }

    /**
     * Allowlisted fields that regular users may update on their own profile.
     * `role`, `isAdmin`, `isActive`, `isDeleted` are intentionally excluded
     * to prevent privilege escalation. Role changes go through `updateUserRole`.
     */
    private static readonly ALLOWED_UPDATE_FIELDS: ReadonlySet<string> = new Set([
        'username',
        'email',
        'photo',
        'firstName',
        'lastName',
    ]);

    private updateUserFields(user: IUser, updateData: Partial<IUser>) {
        for (const key of UserService.ALLOWED_UPDATE_FIELDS) {
            const value = (updateData as Record<string, unknown>)[key];
            if (value !== undefined) {
                (user as unknown as Record<string, unknown>)[key] = value;
            }
        }
        // Password changes MUST go through updateUserPassword (which requires
        // current-password verification via resetPassword or a dedicated endpoint).
        // Allowing password in updateUserFields would let any authenticated user
        // change their password without proving they know the current one.
    }
}

export default new UserService();
