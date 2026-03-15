import jwt, { JwtPayload } from 'jsonwebtoken';
import nodemailer from 'nodemailer';

import { User, IUser } from '../models/User.js';
import { HttpError, HttpStatusCode, UserIdRequiredError } from '../types/Errors.js';
import { getErrorMessage } from '../types/modalTypes.js';
import TokenService from './TokenService.js';

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

    async forgotPassword(email: string) {
        const user = await this.getUserByEmail(email);
        const resetToken = await this.generateResetToken(user);
        await this.sendPasswordResetEmail(user.email, resetToken);
        return { message: 'Email sent with password reset instructions' };
    }

    async resetPassword(resetToken: string, newPassword: string) {
        const user = await this.getUserByResetToken(resetToken);
        await this.updateUserPassword(user, newPassword);
        return { message: 'Password reset successful' };
    }

    async findAllUsers() {
        const users = await User.find({}).exec();
        return users.map(this.getUserResponse);
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
        await User.findByIdAndDelete(userId).exec();
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
            user.notificationSettings = {
                enabled: settings.enabled ?? user.notificationSettings?.enabled ?? true,
                newRestaurants: settings.newRestaurants ?? user.notificationSettings?.newRestaurants ?? true,
                newRecipes: settings.newRecipes ?? user.notificationSettings?.newRecipes ?? true,
                communityUpdates: settings.communityUpdates ?? user.notificationSettings?.communityUpdates ?? true,
                healthTips: settings.healthTips ?? user.notificationSettings?.healthTips ?? false,
                promotions: settings.promotions ?? user.notificationSettings?.promotions ?? false,
            };
        }
        return user.save();
    }

    async updateNotificationSettings(
        userId: string,
        settings: Partial<NonNullable<IUser['notificationSettings']>>
    ): Promise<IUser> {
        const user = await this.findUserById(userId);
        if (!user) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, 'User not found');
        }
        user.notificationSettings = {
            enabled: settings.enabled ?? user.notificationSettings?.enabled ?? true,
            newRestaurants: settings.newRestaurants ?? user.notificationSettings?.newRestaurants ?? true,
            newRecipes: settings.newRecipes ?? user.notificationSettings?.newRecipes ?? true,
            communityUpdates: settings.communityUpdates ?? user.notificationSettings?.communityUpdates ?? true,
            healthTips: settings.healthTips ?? user.notificationSettings?.healthTips ?? false,
            promotions: settings.promotions ?? user.notificationSettings?.promotions ?? false,
        };
        return user.save();
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
