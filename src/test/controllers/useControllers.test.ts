// User Controllers Test - Uses isolated setup to test controllers with real service calls
// This test bypasses global service mocks to test actual controller logic

import { Request, Response, NextFunction } from 'express';
import { createMockData } from '../utils/testHelpers';
import { faker } from '@faker-js/faker';

// Mock UserService específicamente para este test
const mockUserService = {
    registerUser: jest.fn(),
    loginUser: jest.fn(),
    findAllUsers: jest.fn(),
    findUserById: jest.fn(),
    updateUserById: jest.fn(),
    deleteUserById: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    logoutUser: jest.fn(),
};

// Mock específico para UserService sin interferir con setup global
jest.doMock('../../services/UserService', () => ({
    __esModule: true,
    default: mockUserService,
}));

// Import controllers after mocks
import {
    registerUser,
    loginUser,
    getUsers,
    getUserById,
    updateUserProfile,
    deleteUserById,
} from '../../controllers/userControllers';

// Helper to create mock req/res
const createMockReqRes = (body = {}, params = {}, user: { _id?: string; role?: string } | null = null) => {
    const req = {
        body,
        params,
        user,
    } as Request;

    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    const next = jest.fn() as NextFunction;

    return { req, res, next };
};

beforeEach(() => {
    jest.clearAllMocks();
});

// Generate test passwords using faker instead of hardcoded values
const TEST_PASSWORD = faker.internet.password({ length: 12, pattern: /[A-Za-z0-9!@#$%^&*]/ });
const TEST_EMAIL = faker.internet.email();

describe('User Controllers', () => {
    describe('registerUser', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                firstName: 'John',
                lastName: 'Doe',
                email: TEST_EMAIL,
                password: TEST_PASSWORD,
                dateOfBirth: '1990-01-01',
            };

            const createdUser = createMockData.user({
                _id: 'userId',
                ...userData,
            });

            mockUserService.registerUser.mockResolvedValue(createdUser);
            const { req, res, next } = createMockReqRes(userData);

            await registerUser(req, res, next);

            expect(mockUserService.registerUser).toHaveBeenCalledWith(userData, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(createdUser);
        });

        it('should handle registration error', async () => {
            const userData = { email: 'test@example.com' };
            const error = new Error('Registration failed');

            mockUserService.registerUser.mockRejectedValue(error);
            const { req, res, next } = createMockReqRes(userData);

            await registerUser(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 400,
                    message: 'Registration failed',
                })
            );
        });
    });

    describe('loginUser', () => {
        it('should authenticate user successfully', async () => {
            const loginData = {
                email: TEST_EMAIL,
                password: TEST_PASSWORD,
            };

            const loginResult = {
                token: 'mockToken',
                user: createMockData.user({ _id: 'userId', email: TEST_EMAIL }),
            };

            mockUserService.loginUser.mockResolvedValue(loginResult);
            const { req, res, next } = createMockReqRes(loginData);

            await loginUser(req, res, next);

            expect(mockUserService.loginUser).toHaveBeenCalledWith(TEST_EMAIL, TEST_PASSWORD, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(loginResult);
        });
    });

    describe('getUsers', () => {
        it('should return all users', async () => {
            const mockUsers = [
                createMockData.user({ _id: 'user1', firstName: 'John', lastName: 'Doe' }),
                createMockData.user({ _id: 'user2', firstName: 'Jane', lastName: 'Smith' }),
            ];

            mockUserService.findAllUsers.mockResolvedValue(mockUsers);
            const { req, res, next } = createMockReqRes();

            await getUsers(req, res, next);

            expect(mockUserService.findAllUsers).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockUsers);
        });
    });

    describe('getUserById', () => {
        it('should return user by id', async () => {
            const userId = 'user123';
            const mockUser = createMockData.user({
                _id: userId,
                firstName: 'John',
                lastName: 'Doe',
            });

            mockUserService.findUserById.mockResolvedValue(mockUser);
            const { req, res, next } = createMockReqRes({}, { id: userId });

            await getUserById(req, res, next);

            expect(mockUserService.findUserById).toHaveBeenCalledWith(userId);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockUser);
        });

        it('should handle missing user ID', async () => {
            const { req, res, next } = createMockReqRes({}, {});

            await getUserById(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 400,
                    message: 'User ID is required',
                })
            );
        });
    });

    describe('updateUserProfile', () => {
        it('should update user profile', async () => {
            const userId = 'user123';
            const updateData = {
                username: 'updatedUser',
                email: 'update@example.com',
            };

            const updatedUser = createMockData.user({
                _id: userId,
                ...updateData,
            });

            mockUserService.updateUserById.mockResolvedValue(updatedUser);
            const { req, res, next } = createMockReqRes(updateData, {}, { _id: userId });

            await updateUserProfile(req, res, next);

            expect(mockUserService.updateUserById).toHaveBeenCalledWith(userId, updateData);
            expect(res.json).toHaveBeenCalledWith(updatedUser);
        });

        it('should handle missing user', async () => {
            const { req, res, next } = createMockReqRes({});

            await updateUserProfile(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            const calledError = (next as jest.MockedFunction<NextFunction>).mock.calls[0][0];
            expect(calledError).toHaveProperty('statusCode', 500);
            expect(calledError).toHaveProperty('message', 'User not found');
        });
    });

    describe('deleteUserById', () => {
        it('should delete user by id', async () => {
            const userId = 'user123';
            const message = 'User deleted successfully';

            mockUserService.deleteUserById.mockResolvedValue(message);
            const { req, res, next } = createMockReqRes({}, { id: userId });

            await deleteUserById(req, res, next);

            expect(mockUserService.deleteUserById).toHaveBeenCalledWith(userId);
            expect(res.json).toHaveBeenCalledWith(message);
        });

        it('should handle missing user ID', async () => {
            const { req, res, next } = createMockReqRes({}, {});

            await deleteUserById(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 400,
                    message: 'User ID is required',
                })
            );
        });
    });
});
