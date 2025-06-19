import { Response } from 'express';
import UserService from '../../services/UserService';
import { User } from '../../models/User';
import { HttpError, HttpStatusCode } from '../../types/Errors';
import { getErrorMessage } from '../../types/modalTypes';
import generateTokenAndSetCookie from '../../utils/generateToken';

// Mock dependencies
jest.mock('../../models/User');
jest.mock('../../utils/generateToken');
jest.mock('../../utils/logger');

// Mock Response object for testing
const mockResponse = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
} as unknown as Response;

describe('UserService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('registerUser', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
            };

            const mockUser = {
                _id: 'user123',
                username: 'testuser',
                email: 'test@example.com',
                role: 'user',
                photo: 'default.png',
                save: jest.fn(),
            };

            (User.findOne as jest.Mock).mockResolvedValue(null);
            (User.create as jest.Mock).mockResolvedValue(mockUser);
            (generateTokenAndSetCookie as jest.Mock).mockImplementation(() => {});

            const result = await UserService.registerUser(userData, mockResponse);

            expect(User.findOne).toHaveBeenCalledWith({ email: userData.email });
            expect(User.create).toHaveBeenCalledWith(userData);
            expect(generateTokenAndSetCookie).toHaveBeenCalledWith(mockResponse, 'user123');
            expect(result).toEqual({
                _id: 'user123',
                username: 'testuser',
                email: 'test@example.com',
                role: 'user',
                photo: 'default.png',
            });
        });

        it('should throw error if user already exists', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
            };

            (User.findOne as jest.Mock).mockResolvedValue({ email: userData.email });

            await expect(UserService.registerUser(userData, mockResponse)).rejects.toThrow(HttpError);
        });
    });

    describe('loginUser', () => {
        it('should login user with valid credentials', async () => {
            const email = 'test@example.com';
            const password = 'password123';

            const mockUser = {
                _id: 'user123',
                username: 'testuser',
                email,
                role: 'user',
                photo: 'default.png',
                matchPassword: jest.fn().mockResolvedValue(true),
            };

            const mockQuery = {
                select: jest.fn().mockResolvedValue(mockUser),
            };
            (User.findOne as jest.Mock).mockReturnValue(mockQuery);
            (generateTokenAndSetCookie as jest.Mock).mockImplementation(() => {});

            const result = await UserService.loginUser(email, password, mockResponse);

            expect(User.findOne).toHaveBeenCalledWith({ email });
            expect(mockQuery.select).toHaveBeenCalledWith('+password');
            expect(mockUser.matchPassword).toHaveBeenCalledWith(password);
            expect(generateTokenAndSetCookie).toHaveBeenCalledWith(mockResponse, 'user123');
            expect(result).toEqual({
                _id: 'user123',
                username: 'testuser',
                email,
                role: 'user',
                photo: 'default.png',
            });
        });

        it('should throw error for invalid credentials', async () => {
            const email = 'test@example.com';
            const password = 'wrongpassword';

            const mockUser = {
                _id: 'user123',
                email,
                matchPassword: jest.fn().mockResolvedValue(false),
            };

            const mockQuery = {
                select: jest.fn().mockResolvedValue(mockUser),
            };
            (User.findOne as jest.Mock).mockReturnValue(mockQuery);

            await expect(UserService.loginUser(email, password, mockResponse)).rejects.toThrow(HttpError);
        });

        it('should throw error when user not found', async () => {
            const email = 'nonexistent@example.com';
            const password = 'password123';

            const mockQuery = {
                select: jest.fn().mockResolvedValue(null),
            };
            (User.findOne as jest.Mock).mockReturnValue(mockQuery);

            await expect(UserService.loginUser(email, password, mockResponse)).rejects.toThrow(HttpError);
        });
    });

    describe('updateUserById', () => {
        it('should update user successfully', async () => {
            const userId = '1';
            const updateData = { username: 'newusername' };
            const mockUser = {
                _id: userId,
                username: 'oldusername',
                email: 'test@example.com',
                role: 'user',
                photo: 'default.png',
                save: jest.fn().mockResolvedValue({
                    _id: userId,
                    username: 'newusername',
                    email: 'test@example.com',
                    role: 'user',
                    photo: 'default.png',
                }),
            };

            (User.findById as jest.Mock).mockResolvedValue(mockUser);

            const result = await UserService.updateUserById(userId, updateData);

            expect(User.findById).toHaveBeenCalledWith(userId);
            expect(mockUser.save).toHaveBeenCalled();
            expect(result).toEqual(
                expect.objectContaining({
                    username: 'newusername',
                })
            );
        });

        it('should throw NotFound error when user does not exist', async () => {
            const userId = '1';
            const updateData = { username: 'newusername' };

            (User.findById as jest.Mock).mockResolvedValue(null);

            await expect(UserService.updateUserById(userId, updateData)).rejects.toThrow(HttpError);
        });
    });

    describe('deleteUserById', () => {
        it('should delete user successfully', async () => {
            const userId = '1';

            (User.findByIdAndDelete as jest.Mock).mockResolvedValue({ _id: userId });

            const result = await UserService.deleteUserById(userId);

            expect(User.findByIdAndDelete).toHaveBeenCalledWith(userId);
            expect(result).toEqual({ message: 'User deleted successfully' });
        });
    });

    describe('findAllUsers', () => {
        it('should return all users', async () => {
            const mockUsers = [
                { _id: '1', username: 'user1', email: 'user1@example.com', role: 'user', photo: 'default.png' },
                { _id: '2', username: 'user2', email: 'user2@example.com', role: 'user', photo: 'default.png' },
            ];

            (User.find as jest.Mock).mockResolvedValue(mockUsers);

            const result = await UserService.findAllUsers();

            expect(User.find).toHaveBeenCalledWith({});
            expect(result).toEqual([
                { _id: '1', username: 'user1', email: 'user1@example.com', role: 'user', photo: 'default.png' },
                { _id: '2', username: 'user2', email: 'user2@example.com', role: 'user', photo: 'default.png' },
            ]);
        });
    });

    describe('findUserById', () => {
        it('should return user by id', async () => {
            const userId = '1';
            const mockUser = { _id: userId, username: 'testuser' };

            (User.findById as jest.Mock).mockResolvedValue(mockUser);

            const result = await UserService.findUserById(userId);

            expect(User.findById).toHaveBeenCalledWith(userId);
            expect(result).toEqual(mockUser);
        });

        it('should return null when user not found', async () => {
            const userId = '1';

            (User.findById as jest.Mock).mockResolvedValue(null);

            const result = await UserService.findUserById(userId);

            expect(result).toBeNull();
        });
    });

    describe('logoutUser', () => {
        it('should logout user successfully', async () => {
            const result = await UserService.logoutUser(mockResponse);


            expect(mockResponse.clearCookie).toHaveBeenCalledWith('jwt');
            expect(result).toEqual({ message: 'User logged out successfully' });
        development
        });
    });
});
