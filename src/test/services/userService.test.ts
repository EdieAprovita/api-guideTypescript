import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UserService } from '../../services/UserService';
import { User } from '../../models/User';
import { generateTokenAndSetCookie } from '../../utils/generateToken';

// Mock dependencies
vi.mock('../../models/User');
vi.mock('../../utils/generateToken');

const mockUser = {
    _id: 'c5b8bf2a495eaaacff3eb03c',
    username: 'Odessa_Ward0',
    email: 'America10@hotmail.com',
    role: 'user',
    photo: 'default.png',
    matchPassword: vi.fn(),
    save: vi.fn(),
};

const mockResponse = {
    cookie: vi.fn(),
};

describe('UserService', () => {
    let userService: UserService;

    beforeEach(() => {
        vi.clearAllMocks();
        userService = new UserService();

        // Setup default mock implementations
        (User.create as any).mockResolvedValue(mockUser);
        (User.findOne as any).mockResolvedValue(mockUser);
        (generateTokenAndSetCookie as any).mockResolvedValue(undefined);
        mockUser.matchPassword.mockResolvedValue(true);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('registerUser', () => {
        it('should register user successfully', async () => {
            const userData = {
                username: 'Toby.Halvorson3',
                email: 'Reymundo_Lemke@gmail.com',
                password: 'testPassword123',
            };

            const result = await userService.registerUser(userData, mockResponse as any);

            expect(User.create).toHaveBeenCalledWith(userData);
            expect(generateTokenAndSetCookie).toHaveBeenCalledWith(mockResponse, mockUser._id);
            expect(result).toEqual(
                expect.objectContaining({
                    _id: mockUser._id,
                    email: mockUser.email,
                    username: mockUser.username,
                    role: mockUser.role,
                    photo: mockUser.photo,
                })
            );
        });

        it('should handle registration errors', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'testPassword123',
            };

            (User.create as any).mockRejectedValue(new Error('Registration failed'));

            await expect(userService.registerUser(userData, mockResponse as any)).rejects.toThrow(
                'Registration failed'
            );
        });
    });

    describe('loginUser', () => {
        it('should login user with valid credentials', async () => {
            const email = 'America10@hotmail.com';
            const password = 'testPassword123';

            const result = await userService.loginUser(email, password, mockResponse as any);

            expect(User.findOne).toHaveBeenCalledWith({ email });
            expect(mockUser.matchPassword).toHaveBeenCalledWith(password);
            expect(generateTokenAndSetCookie).toHaveBeenCalledWith(mockResponse, mockUser._id);
            expect(result).toEqual(
                expect.objectContaining({
                    _id: mockUser._id,
                    email: mockUser.email,
                    username: mockUser.username,
                    role: mockUser.role,
                    photo: mockUser.photo,
                })
            );
        });

        it('should throw error for non-existent user', async () => {
            const email = 'nonexistent@example.com';
            const password = 'testPassword123';

            (User.findOne as any).mockResolvedValue(null);

            await expect(userService.loginUser(email, password, mockResponse as any)).rejects.toThrow(
                'Invalid email or password'
            );
        });

        it('should throw error for invalid password', async () => {
            const email = 'America10@hotmail.com';
            const password = 'wrongPassword';

            mockUser.matchPassword.mockResolvedValue(false);

            await expect(userService.loginUser(email, password, mockResponse as any)).rejects.toThrow(
                'Invalid email or password'
            );
        });
    });

    describe('getUserById', () => {
        it('should return user by id', async () => {
            const userId = 'c5b8bf2a495eaaacff3eb03c';

            const result = await userService.getUserById(userId);

            expect(User.findById).toHaveBeenCalledWith(userId);
            expect(result).toEqual(mockUser);
        });

        it('should return null for non-existent user', async () => {
            const userId = 'nonexistent';

            (User.findById as any).mockResolvedValue(null);

            const result = await userService.getUserById(userId);

            expect(result).toBeNull();
        });
    });

    describe('updateUser', () => {
        it('should update user successfully', async () => {
            const userId = 'c5b8bf2a495eaaacff3eb03c';
            const updateData = { username: 'updatedUsername' };

            mockUser.save.mockResolvedValue({ ...mockUser, ...updateData });

            const result = await userService.updateUser(userId, updateData);

            expect(User.findById).toHaveBeenCalledWith(userId);
            expect(mockUser.save).toHaveBeenCalled();
            expect(result).toEqual(expect.objectContaining(updateData));
        });

        it('should throw error for non-existent user', async () => {
            const userId = 'nonexistent';
            const updateData = { username: 'updatedUsername' };

            (User.findById as any).mockResolvedValue(null);

            await expect(userService.updateUser(userId, updateData)).rejects.toThrow('User not found');
        });
    });

    describe('deleteUser', () => {
        it('should delete user successfully', async () => {
            const userId = 'c5b8bf2a495eaaacff3eb03c';

            (User.findByIdAndDelete as any).mockResolvedValue(mockUser);

            const result = await userService.deleteUser(userId);

            expect(User.findByIdAndDelete).toHaveBeenCalledWith(userId);
            expect(result).toEqual(mockUser);
        });

        it('should return null for non-existent user', async () => {
            const userId = 'nonexistent';

            (User.findByIdAndDelete as any).mockResolvedValue(null);

            const result = await userService.deleteUser(userId);

            expect(result).toBeNull();
        });
    });
});
