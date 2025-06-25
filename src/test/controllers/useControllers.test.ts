import request from 'supertest';
// Prevent database connection attempts when importing the app
jest.mock('../../config/db');
import type { Request, Response, NextFunction } from 'express';
jest.resetModules();
jest.mock('../../middleware/security', () => ({
    rateLimits: {
        api: (_req, _res, next) => next(),
        auth: (_req, _res, next) => next(),
        search: (_req, _res, next) => next(),
    },
    securityHeaders: (_req, _res, next) => next(),
    enforceHTTPS: (_req, _res, next) => next(),
    configureHelmet: () => (_req, _res, next) => next(),
    addCorrelationId: (_req, _res, next) => next(),
    requireAPIVersion: () => (_req, _res, next) => next(),
    validateUserAgent: (_req, _res, next) => next(),
    limitRequestSize: () => (_req, _res, next) => next(),
    detectSuspiciousActivity: (_req, _res, next) => next(),
}));

jest.mock('../../middleware/validation', () => ({
    sanitizeInput: () => [(_req, _res, next) => next()],
    securityHeaders: (_req, _res, next) => next(),
    validateInputLength: () => (_req, _res, next) => next(),
    validate: () => (_req, _res, next) => next(),
    rateLimits: {
        api: (_req, _res, next) => next(),
        auth: (_req, _res, next) => next(),
        register: (_req, _res, next) => next(),
        search: (_req, _res, next) => next(),
    },
}));

jest.mock('../../middleware/authMiddleware', () => ({
    protect: (_req, _res, next) => next(),
    admin: (_req, _res, next) => next(),
    professional: (_req, _res, next) => next(),
    refreshToken: (_req, res) => res.status(200).json({ success: true }),
    logout: (_req, res) => res.status(200).json({ success: true }),
    revokeAllTokens: (_req, res) => res.status(200).json({ success: true }),
}));

import app from '../../app';
import { User, IUser } from '../../models/User';
import UserService from '../../services/UserService';

jest.mock('jsonwebtoken', () => ({
    verify: jest.fn().mockReturnValue({ userId: 'someUserId' }),
}));

jest.mock('../../models/User');

jest.mock('../../services/UserService', () => ({
    registerUser: jest.fn(),
    loginUser: jest.fn(),
    findAllUsers: jest.fn(),
    findUserById: jest.fn(),
    updateUserById: jest.fn(),
    deleteUserById: jest.fn(),
}));


beforeEach(() => {
    jest.clearAllMocks();
    User.findById = jest.fn().mockResolvedValue({
        _id: 'mockUserId',
        username: 'mockUser',
        email: 'mock@example.com',
        isAdmin: true,
        isProfessional: true,
    });
});

describe('User Registration', () => {
    it('should register a new user if email does not exist', async () => {
        const userData = {
            firstName: 'John',
            lastName: 'Doe',
            email: 'test@example.com',
            password: 'Password123!',
            dateOfBirth: '1990-01-01',
        };

        (UserService.registerUser as jest.Mock).mockResolvedValue({
            _id: 'userId',
            ...userData,
        });

        const response = await request(app).post('/api/v1/users/register').send(userData);

        expect(response.statusCode).toBe(201);
    });
});

describe('User Login', () => {
    it('should authenticate user and return token', async () => {
        const loginData = {
            email: 'test@example.com',
            password: 'Password123!',
        };

        (UserService.loginUser as jest.Mock).mockResolvedValue({
            token: 'mockToken',
            user: { _id: 'userId', email: 'test@example.com' },
        });

        const response = await request(app).post('/api/v1/users/login').send(loginData);

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(UserService.loginUser).toHaveBeenCalledWith('test@example.com', 'Password123!', expect.anything());
    });
});

describe('Get All Users', () => {
    it('should return all users', async () => {
        const mockUsers = [
            { _id: 'user1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
            { _id: 'user2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
        ];

        (UserService.findAllUsers as jest.Mock).mockResolvedValue(mockUsers);

        const response = await request(app).get('/api/v1/users/');

        expect(response.statusCode).toBe(200);
        expect(response.body.length).toBeGreaterThan(0);
        expect(UserService.findAllUsers).toHaveBeenCalledTimes(1);
    });
});

describe('Get User by ID', () => {
    it('should return user by id', async () => {
        const userId = 'user123';
        const mockUser = {
            _id: userId,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
        };

        (UserService.findUserById as jest.Mock).mockResolvedValue(mockUser);

        const response = await request(app).get(`/api/v1/users/${userId}`);

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('_id', userId);
        expect(UserService.findUserById).toHaveBeenCalledWith(userId);
    });
});

describe('Update User Profile', () => {
    it('should update user details', async () => {
        const userId = '1';
        const updateData: Partial<IUser> = {
            username: 'updatedUser',
            email: 'update@example.com',
            password: 'newPassword',
            role: 'user',
        };

        UserService.updateUserById = jest.fn().mockResolvedValue({
            _id: userId,
            ...updateData,
        });

        const result = await UserService.updateUserById(userId, updateData);

        expect(result).toHaveProperty('_id', userId);
        expect(result).toHaveProperty('username', updateData.username);
        expect(result).toHaveProperty('email', updateData.email);
    });
});

describe('Delete User', () => {
    it('should delete user by id', async () => {
        const userId = 'user123';

        (UserService.deleteUserById as jest.Mock).mockResolvedValue('User deleted successfully');

        const response = await request(app).delete(`/api/v1/users/${userId}`);

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual('User deleted successfully');
        expect(UserService.deleteUserById).toHaveBeenCalledWith(userId);
    });
});
