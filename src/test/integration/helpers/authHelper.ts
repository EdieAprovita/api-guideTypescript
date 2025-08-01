import jwt from 'jsonwebtoken';
import { User } from '../../../models/User';
import { Types } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import { generateTestPassword } from '../../utils/passwordGenerator';
import { randomBytes } from 'crypto';

interface AuthenticatedRequest extends Request {
    user?: {
        _id?: string;
        role: 'user' | 'professional' | 'admin';
    };
}

interface TestUser {
    _id: Types.ObjectId;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    userCredential: string;
    role: string;
}

/**
 * Creates a test user in the database
 */
export const createTestUser = async (email: string = 'test@example.com', role: string = 'user'): Promise<TestUser> => {
    // Use generated credential for testing to avoid security issues
    const generatedCredential = generateTestPassword();

    const userData = {
        email,
        username: `testuser_${Date.now()}_${randomBytes(4).toString('hex')}`,
        firstName: 'Test',
        lastName: 'User',
        password: generatedCredential,
        role,
        isVerified: true,
        isAdmin: role === 'admin',
        isActive: true,
        isDeleted: false,
    };

    const user = await User.create(userData);
    return user as unknown as TestUser;
};

/**
 * Creates an admin test user
 */
export const createAdminUser = async (email: string = 'admin@example.com'): Promise<TestUser> => {
    return createTestUser(email, 'admin');
};

/**
 * Creates a moderator test user
 */
export const createModeratorUser = async (email: string = 'moderator@example.com'): Promise<TestUser> => {
    return createTestUser(email, 'moderator');
};

/**
 * Generates a JWT token for testing compatible with TokenService
 */
export const generateAuthToken = (
    userId: string,
    role: string = 'user',
    email: string = 'test@example.com'
): string => {
    const payload = {
        userId: userId,
        email: email,
        role: role,
    };

    const secret = process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing';

    return jwt.sign(payload, secret, {
        expiresIn: '24h',
        issuer: 'vegan-guide-api',
        audience: 'vegan-guide-client',
    });
};

/**
 * Generates an expired JWT token for testing
 */
export const generateExpiredAuthToken = (userId: string): string => {
    const payload = {
        userId: userId,
        email: 'test@example.com',
        role: 'user',
    };

    const secret = process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing';

    return jwt.sign(payload, secret, {
        expiresIn: '-1h', // Expired 1 hour ago
        issuer: 'vegan-guide-api',
        audience: 'vegan-guide-client',
    });
};

/**
 * Generates an invalid JWT token for testing
 */
export const generateInvalidAuthToken = (): string => {
    return 'invalid.jwt.token';
};

/**
 * Creates multiple test users for bulk testing
 */
export const createMultipleTestUsers = async (count: number): Promise<TestUser[]> => {
    const users: TestUser[] = [];

    for (let i = 0; i < count; i++) {
        const user = await createTestUser(`testuser${i}@example.com`);
        users.push(user);
    }

    return users;
};

/**
 * Login helper that returns both user and token
 */
export const loginTestUser = async (email: string, userCredential?: string) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('User not found');
    }

    // For testing purposes, we skip actual credential validation
    // In real tests, the user credential would be validated properly
    const providedCredential = userCredential || generateTestPassword();
    const isCredentialValid = !!providedCredential;
    if (!isCredentialValid) {
        throw new Error('Invalid credential');
    }

    const token = generateAuthToken(user._id.toString(), user.role, user.email);

    return {
        user: user.toObject(),
        token,
    };
};

/**
 * Creates a test user with specific permissions for business operations
 */
export const createBusinessOwnerUser = async (email: string = 'business@example.com'): Promise<TestUser> => {
    const user = await createTestUser(email, 'business_owner');
    return user;
};

/**
 * Utility to clean up test users
 */
export const cleanupTestUsers = async (): Promise<void> => {
    await User.deleteMany({
        email: { $regex: /test|example\.com/ },
    });
};

/**
 * Creates a verified user for email verification tests
 */
export const createVerifiedUser = async (email: string = 'verified@example.com'): Promise<TestUser> => {
    const user = await createTestUser(email);
    await User.findByIdAndUpdate(user._id, {
        isVerified: true,
        emailVerificationToken: undefined,
        emailVerificationExpires: undefined,
    });

    return user;
};

/**
 * Creates an unverified user for email verification tests
 */
export const createUnverifiedUser = async (email: string = 'unverified@example.com'): Promise<TestUser> => {
    // Use generated credential for testing to avoid security issues
    const generatedCredential = generateTestPassword();

    const userData = {
        email,
        username: `unverified_${Date.now()}_${randomBytes(4).toString('hex')}`,
        firstName: 'Unverified',
        lastName: 'User',
        password: generatedCredential,
        role: 'user',
        isVerified: false,
        emailVerificationToken: 'test_verification_token',
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    const user = await User.create(userData);
    return user as unknown as TestUser;
};

/**
 * Mock authentication middleware bypass for testing
 */
export const bypassAuth = () => {
    return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = {
            _id: 'test_user_id',
            role: 'user',
        };
        next();
    };
};
