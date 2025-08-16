import { vi, describe, it, beforeEach, expect } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { faker } from '@faker-js/faker';

// Mock all dependencies first
vi.mock('../../services/UserService', () => ({
    default: {
        registerUser: vi.fn().mockImplementation(async (userData, res) => {
            return { user: { _id: 'user123', email: userData.email }, accessToken: 'token123' };
        }),
        loginUser: vi.fn().mockImplementation(async (email, password, res) => {
            return { user: { _id: 'user123', email }, accessToken: 'token123' };
        }),
        findAllUsers: vi.fn().mockResolvedValue([{ _id: 'user1' }, { _id: 'user2' }]),
        findUserById: vi.fn().mockResolvedValue({ _id: 'user123', email: 'john@example.com' }),
        updateUserById: vi.fn().mockResolvedValue({ _id: 'user123', firstName: 'Jane' }),
        deleteUserById: vi.fn().mockResolvedValue({ message: 'User deleted successfully' }),
    }
}));

vi.mock('../../services/TokenService', () => ({
    default: vi.fn().mockImplementation(() => ({
        generateTokens: vi.fn().mockResolvedValue({ accessToken: 'token123', refreshToken: 'refresh123' })
    }))
}));

vi.mock('../../config/database', () => ({
    default: { connect: vi.fn() }
}));

vi.mock('../../utils/hashPassword', () => ({
    hashPassword: vi.fn().mockResolvedValue('hashedPassword'),
    comparePasswords: vi.fn().mockResolvedValue(true)
}));

vi.mock('../../models/User', () => ({
    User: {
        create: vi.fn().mockResolvedValue({ _id: 'user123', email: 'john@example.com' }),
        findOne: vi.fn().mockResolvedValue(null),
        find: vi.fn().mockResolvedValue([{ _id: 'user1' }, { _id: 'user2' }]),
        findById: vi.fn().mockResolvedValue({ _id: 'user123', email: 'john@example.com' }),
        findByIdAndUpdate: vi.fn().mockResolvedValue({ _id: 'user123', firstName: 'Jane' }),
        findByIdAndDelete: vi.fn().mockResolvedValue({ _id: 'user123' }),
    }
}));

vi.mock('../../utils/generateToken', () => ({
    default: vi.fn().mockResolvedValue('token123')
}));

// Simple user controller tests
describe('User Controllers - Simple', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        vi.clearAllMocks();
        
        req = {
            body: {},
            params: {},
            user: { _id: faker.database.mongodbObjectId(), role: 'user' }
        };
        
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };
        
        next = vi.fn();
    });

    it('should register a new user successfully', async () => {
        req.body = {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'password123'
        };

        const { registerUser } = await import('../../controllers/userControllers');
        
        await registerUser(req as Request, res as Response, next);
        
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should login user successfully', async () => {
        req.body = {
            email: 'john@example.com',
            password: 'password123'
        };

        const { loginUser } = await import('../../controllers/userControllers');
        
        await loginUser(req as Request, res as Response, next);
        
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should get all users', async () => {
        const { getUsers } = await import('../../controllers/userControllers');
        
        await getUsers(req as Request, res as Response, next);
        
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should get user by id', async () => {
        req.params = { id: faker.database.mongodbObjectId() };

        const { getUserById } = await import('../../controllers/userControllers');
        
        await getUserById(req as Request, res as Response, next);
        
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should update user profile', async () => {
        const userId = faker.database.mongodbObjectId();
        req.params = { id: userId };
        req.body = { firstName: 'Jane' };
        req.user = { _id: userId, role: 'user' }; // Same user ID

        const { updateUserProfile } = await import('../../controllers/userControllers');
        
        await updateUserProfile(req as Request, res as Response, next);
        
        expect(res.json).toHaveBeenCalled();
    });

    it('should delete user by id', async () => {
        const userId = faker.database.mongodbObjectId();
        req.params = { id: userId };
        req.user = { _id: userId, role: 'admin' };

        const { deleteUserById } = await import('../../controllers/userControllers');
        
        await deleteUserById(req as Request, res as Response, next);
        
        expect(next).toHaveBeenCalled();
    });
});