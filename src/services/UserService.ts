import { Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';

import { User, IUser } from '../models/User';
import { HttpError, HttpStatusCode, UserIdRequiredError } from '../types/Errors';
import { getErrorMessage } from '../types/modalTypes';
import generateTokenAndSetCookie from '../utils/generateToken';
import TokenService from './TokenService';

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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
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
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, 'JWT secret not configured');
        }
        return jwt.sign({ userId: user._id }, secret, {
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
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, 'JWT secret not configured');
        }
        const decoded = jwt.verify(resetToken, secret) as JwtPayload;
        if (!decoded) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid token'));
        }

        const user = await User.findById(decoded.userId).exec();
        this.validateUserExists(user);
        return user!;
    }

    protected async updateUserPassword(user: IUser, newPassword: string) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();
    }

    protected generateJWTToken(userId: string): string {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, 'JWT secret not configured');
        }
        return jwt.sign({ userId }, secret, {
            expiresIn: '30d',
        });
    }
}

class UserService extends BaseService {
    async registerUser(userData: Pick<IUser, 'username' | 'email' | 'password'>, res: Response) {
        try {
            // Debug logging for integration tests
            if (process.env.NODE_ENV === 'test') {
                console.log('=== UserService.registerUser REAL METHOD CALLED ===');
                console.log('userData received:', userData);
            }

            await this.validateUserNotExists(userData.email);
            const user = await User.create(userData);

            if (process.env.NODE_ENV === 'test') {
                console.log('User created:', user?._id);
            }

            const tokens = await TokenService.generateTokens(user._id.toString(), user.email, user.role);

            if (process.env.NODE_ENV === 'test') {
                console.log('Tokens generated:', !!tokens.accessToken);
            }

            generateTokenAndSetCookie(res, user._id);

            const result = {
                ...this.getUserResponse(user),
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            };

            if (process.env.NODE_ENV === 'test') {
                console.log('Final result:', result);
            }

            return result;
        } catch (error) {
            // In test environment, log the error to understand what's happening
            if (process.env.NODE_ENV === 'test') {
                console.log('UserService.registerUser error:', error);
            }
            throw error;
        }
    }

    async loginUser(email: string, password: string, res: Response) {
        const sanitizedEmail = validateAndSanitizeEmail(email);
        const user = await User.findOne({ email: sanitizedEmail }).select('+password').exec();
        await this.validateUserCredentials(user, password);
        const tokens = await TokenService.generateTokens(user!._id.toString(), user!.email, user!.role);
        generateTokenAndSetCookie(res, user!._id);
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

    async logoutUser(res: Response) {
        res.clearCookie('jwt');
        return { message: 'User logged out successfully' };
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

    private getUserResponse(user: IUser) {
        const { _id, username, email, role, photo } = user;
        return { _id, username, email, role, photo };
    }

    private updateUserFields(user: IUser, updateData: Partial<IUser>) {
        const { password, username, email, photo, role } = updateData;
        if (password) {
            user.password = password;
        }
        user.username = username ?? user.username;
        user.email = email ?? user.email;
        user.photo = photo ?? user.photo;
        user.role = role ?? user.role;
    }
}

export default new UserService();
