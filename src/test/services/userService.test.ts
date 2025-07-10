import { Response } from 'express';
import UserService from '../../services/UserService';
import { User, IUser } from '../../models/User';
import { HttpError } from '../../types/Errors';
import generateTokenAndSetCookie from '../../utils/generateToken';
import { faker } from '@faker-js/faker';
import { jest } from '@jest/globals';
import testConfig from '../testConfig';

// Mock dependencies
jest.mock('../../models/User');
jest.mock('../../utils/generateToken');
jest.mock('../../utils/logger');
jest.mock('bcryptjs');

// Mock Response object for testing
const mockResponse = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
    end: jest.fn(),
} as unknown as Response;

// Test data using testConfig utilities
const TEST_PASSWORD = testConfig.generateTestPassword();
const WRONG_PASSWORD = testConfig.generateTestPassword();

// Mock User model
const mockUserModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
    find: jest.fn(),
};

// Apply mock to User
Object.assign(User, mockUserModel);

// Mock generateTokenAndSetCookie
const mockGenerateTokenAndSetCookie = generateTokenAndSetCookie as jest.MockedFunction<typeof generateTokenAndSetCookie>;

describe('UserService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('registerUser', () => {
        it('should register user successfully', async () => {
            const userData = {
                username: faker.internet.userName(),
                email: faker.internet.email(),
                password: TEST_PASSWORD,
            };

            const mockUser = {
                _id: faker.database.mongodbObjectId(),
                username: userData.username,
                email: userData.email,
                role: 'user',
                photo: 'default.png',
            };

            mockUserModel.findOne.mockResolvedValue(null);
            mockUserModel.create.mockResolvedValue(mockUser);
            mockGenerateTokenAndSetCookie.mockImplementation(() => {});

            const result = await UserService.registerUser(userData, mockResponse);

            expect(User.findOne).toHaveBeenCalledWith({ email: userData.email });
            expect(User.create).toHaveBeenCalledWith(userData);
            expect(generateTokenAndSetCookie).toHaveBeenCalledWith(mockResponse, mockUser._id);
            expect(result).toEqual(
                expect.objectContaining({
                    _id: mockUser._id,
                    username: mockUser.username,
                    email: mockUser.email,
                    role: mockUser.role,
                    photo: mockUser.photo,
                    token: expect.any(String),
                })
            );
        });

        it('should throw error if user already exists', async () => {
            const userData = {
                username: faker.internet.userName(),
                email: faker.internet.email(),
                password: TEST_PASSWORD,
            };

            const existingUser = {
                _id: faker.database.mongodbObjectId(),
                username: userData.username,
                email: userData.email,
                role: 'user',
                photo: 'default.png',
            };

            mockUserModel.findOne.mockResolvedValue(existingUser);

            await expect(UserService.registerUser(userData, mockResponse)).rejects.toThrow(HttpError);
        });
    });

    describe('loginUser', () => {
        it('should login user with valid credentials', async () => {
            const email = faker.internet.email();
            const password = TEST_PASSWORD;
            
            const mockUser = {
                _id: faker.database.mongodbObjectId(),
                username: faker.internet.userName(),
                email: email,
                role: 'user',
                photo: 'default.png',
                matchPassword: jest.fn().mockResolvedValue(true),
            };

            const mockQuery = {
                select: jest.fn().mockResolvedValue(mockUser),
            };

            mockUserModel.findOne.mockReturnValue(mockQuery);
            mockGenerateTokenAndSetCookie.mockImplementation(() => {});

            const result = await UserService.loginUser(email, password, mockResponse);

            expect(User.findOne).toHaveBeenCalledWith({ email });
            expect(mockQuery.select).toHaveBeenCalledWith('+password');
            expect(mockUser.matchPassword).toHaveBeenCalledWith(password);
            expect(generateTokenAndSetCookie).toHaveBeenCalledWith(mockResponse, mockUser._id);
            expect(result).toEqual(
                expect.objectContaining({
                    _id: mockUser._id,
                    username: mockUser.username,
                    email: mockUser.email,
                    role: mockUser.role,
                    photo: mockUser.photo,
                    token: expect.any(String),
                })
            );
        });

        it('should throw error for invalid credentials', async () => {
            const email = faker.internet.email();
            const password = WRONG_PASSWORD;
            
            const mockUser = {
                _id: faker.database.mongodbObjectId(),
                username: faker.internet.userName(),
                email: email,
                role: 'user',
                photo: 'default.png',
                matchPassword: jest.fn().mockResolvedValue(false),
            };

            const mockQuery = {
                select: jest.fn().mockResolvedValue(mockUser),
            };

            mockUserModel.findOne.mockReturnValue(mockQuery);

            await expect(UserService.loginUser(email, password, mockResponse)).rejects.toThrow(HttpError);
        });

        it('should throw error when user not found', async () => {
            const email = faker.internet.email();
            const password = TEST_PASSWORD;
            
            const mockQuery = {
                select: jest.fn().mockResolvedValue(null),
            };

            mockUserModel.findOne.mockReturnValue(mockQuery);

            await expect(UserService.loginUser(email, password, mockResponse)).rejects.toThrow(HttpError);
        });
    });

    describe('updateUserById', () => {
        it('should update user successfully', async () => {
            const userId = faker.database.mongodbObjectId();
            const updateData = { username: 'newusername' };
            
            const updatedUser = {
                _id: userId,
                username: 'newusername',
                email: faker.internet.email(),
                role: 'user',
                photo: 'default.png',
            };

            const mockUser = {
                _id: userId,
                username: 'oldusername',
                email: faker.internet.email(),
                role: 'user',
                photo: 'default.png',
                save: jest.fn().mockResolvedValue(updatedUser),
            };

            mockUserModel.findById.mockResolvedValue(mockUser);

            const result = await UserService.updateUserById(userId, updateData);

            expect(User.findById).toHaveBeenCalledWith(userId);
            expect(mockUser.save).toHaveBeenCalled();
            expect(result).toEqual(updatedUser);
        });

        it('should throw NotFound error when user does not exist', async () => {
            const userId = faker.database.mongodbObjectId();
            const updateData = { username: 'newusername' };

            mockUserModel.findById.mockResolvedValue(null);

            await expect(UserService.updateUserById(userId, updateData)).rejects.toThrow(HttpError);
        });
    });

    describe('deleteUserById', () => {
        it('should delete user successfully', async () => {
            const userId = faker.database.mongodbObjectId();
            const deletedUser = {
                _id: userId,
                username: faker.internet.userName(),
                email: faker.internet.email(),
                role: 'user',
                photo: 'default.png',
            };

            mockUserModel.findByIdAndDelete.mockResolvedValue(deletedUser);

            const result = await UserService.deleteUserById(userId);

            expect(User.findByIdAndDelete).toHaveBeenCalledWith(userId);
            expect(result).toEqual({ message: 'User deleted successfully' });
        });
    });

    describe('findAllUsers', () => {
        it('should return all users', async () => {
            const mockUsers = [
                {
                    _id: '1',
                    username: faker.internet.userName(),
                    email: faker.internet.email(),
                    role: 'user',
                    photo: 'default.png',
                },
                {
                    _id: '2',
                    username: faker.internet.userName(),
                    email: faker.internet.email(),
                    role: 'user',
                    photo: 'default.png',
                }
            ];

            mockUserModel.find.mockResolvedValue(mockUsers);

            const result = await UserService.findAllUsers();

            expect(User.find).toHaveBeenCalledWith({});
            expect(result).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        _id: '1',
                        username: expect.any(String),
                        email: expect.any(String),
                        role: 'user',
                        photo: 'default.png',
                    }),
                    expect.objectContaining({
                        _id: '2',
                        username: expect.any(String),
                        email: expect.any(String),
                        role: 'user',
                        photo: 'default.png',
                    }),
                ])
            );
        });
    });

    describe('findUserById', () => {
        it('should return user by id', async () => {
            const userId = faker.database.mongodbObjectId();
            const mockUser = {
                _id: userId,
                username: faker.internet.userName(),
                email: faker.internet.email(),
                role: 'user',
                photo: 'default.png',
            };

            mockUserModel.findById.mockResolvedValue(mockUser);

            const result = await UserService.findUserById(userId);

            expect(User.findById).toHaveBeenCalledWith(userId);
            expect(result).toEqual(mockUser);
        });

        it('should return null when user not found', async () => {
            const userId = faker.database.mongodbObjectId();

            mockUserModel.findById.mockResolvedValue(null);

            const result = await UserService.findUserById(userId);

            expect(result).toBeNull();
        });
    });

    describe('logoutUser', () => {
        it('should logout user successfully', async () => {
            const result = await UserService.logoutUser(mockResponse);

            expect(mockResponse.clearCookie).toHaveBeenCalledWith('jwt');
            expect(result).toEqual({ message: 'User logged out successfully' });
        });
    });
});