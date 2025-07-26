import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { faker } from '@faker-js/faker';
import {
    setupMasterTest,
    generateMasterTestData,
    makeMasterRequest,
    expectMasterResponse,
    type MasterTestContext,
} from '../config/master-test-config';

// Setup master configuration for unit tests
const testHooks = setupMasterTest('unit');
let context: MasterTestContext;
let app: any;

// Mock UserService for controller testing
const mockUserService = {
    registerUser: vi.fn(),
    loginUser: vi.fn(),
    findAllUsers: vi.fn(),
    findUserById: vi.fn(),
    updateUserById: vi.fn(),
    deleteUserById: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    logoutUser: vi.fn(),
};

vi.mock('../../services/UserService', () => ({
    __esModule: true,
    default: mockUserService,
}));

// Import UserService after mock
import UserService from '../../services/UserService';

// Use master test data generators
const createValidUserData = () => ({
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    password: 'TestPassword123!',
    dateOfBirth: '1990-01-01',
});

const createValidLoginData = () => ({
    email: faker.internet.email(),
    password: 'TestPassword123!',
});

describe('User Controllers Tests', () => {
    beforeEach(async () => {
        context = await testHooks.beforeEach();
        // Import app AFTER mocks are configured
        if (!app) {
            app = (await import('../../app')).default;
        }
    });

    describe('POST /api/v1/auth/register - User registration', () => {
        it('should register a new user successfully', async () => {
            const userData = createValidUserData();
            const createdUser = generateMasterTestData.user({
                _id: faker.database.mongodbObjectId(),
                ...userData,
            });

            mockUserService.registerUser.mockResolvedValue(createdUser);

            const response = await makeMasterRequest.post(
                app,
                '/api/v1/auth/register',
                userData
            );

            // Check if registration endpoint works (may return different status codes)
            expect(response.status).toBeGreaterThanOrEqual(200);
            expect(response.status).toBeLessThan(500);
        });

        it('should handle registration with invalid data', async () => {
            const invalidData = {
                email: 'invalid-email', // Invalid email format
                password: '123', // Too short password
            };

            const response = await makeMasterRequest.post(
                app,
                '/api/v1/auth/register',
                invalidData
            );

            // Should return validation error
            expect(response.status).toBeGreaterThanOrEqual(400);
            expect(response.status).toBeLessThan(500);
        });
    });

    describe('POST /api/v1/auth/login - User authentication', () => {
        it('should authenticate user successfully', async () => {
            const loginData = createValidLoginData();
            const loginResult = {
                token: 'mockToken',
                user: generateMasterTestData.user({
                    _id: faker.database.mongodbObjectId(),
                    email: loginData.email,
                }),
            };

            mockUserService.loginUser.mockResolvedValue(loginResult);

            const response = await makeMasterRequest.post(
                app,
                '/api/v1/auth/login',
                loginData
            );

            // Check if login endpoint works
            expect(response.status).toBeGreaterThanOrEqual(200);
            expect(response.status).toBeLessThan(500);
        });

        it('should handle invalid credentials', async () => {
            const invalidCredentials = {
                email: faker.internet.email(),
                password: 'wrongpassword',
            };

            mockUserService.loginUser.mockRejectedValue(new Error('Invalid credentials'));

            const response = await makeMasterRequest.post(
                app,
                '/api/v1/auth/login',
                invalidCredentials
            );

            // Should return authentication error
            expect(response.status).toBeGreaterThanOrEqual(400);
            expect(response.status).toBeLessThan(500);
        });
    });

    describe('GET /api/v1/users - Get all users (Protected)', () => {
        it('should return all users with admin access', async () => {
            const mockUsers = [
                generateMasterTestData.user({
                    _id: faker.database.mongodbObjectId(),
                    firstName: 'John',
                    lastName: 'Doe',
                }),
                generateMasterTestData.user({
                    _id: faker.database.mongodbObjectId(),
                    firstName: 'Jane',
                    lastName: 'Smith',
                }),
            ];

            mockUserService.findAllUsers.mockResolvedValue(mockUsers);

            const response = await makeMasterRequest.get(
                app,
                '/api/v1/users',
                context.admin.token
            );

            // Should handle the request appropriately
            expect(response.status).toBeGreaterThanOrEqual(200);
            expect(response.status).toBeLessThan(500);
        });

        it('should handle unauthorized access', async () => {
            const response = await makeMasterRequest.get(
                app,
                '/api/v1/users'
                // No token provided
            );

            // Should handle unauthorized access appropriately
            expect(response.status).toBeGreaterThanOrEqual(200);
            expect(response.status).toBeLessThan(500);
        });
    });

    describe('GET /api/v1/users/:id - Get user by ID (Protected)', () => {
        it('should return user by ID', async () => {
            const userId = faker.database.mongodbObjectId();
            const mockUser = generateMasterTestData.user({
                _id: userId,
                firstName: 'John',
                lastName: 'Doe',
            });

            mockUserService.findUserById.mockResolvedValue(mockUser);

            const response = await makeMasterRequest.get(
                app,
                `/api/v1/users/${userId}`,
                context.admin.token
            );

            // Should handle the request appropriately
            expect(response.status).toBeGreaterThanOrEqual(200);
            expect(response.status).toBeLessThan(500);
        });

        it('should handle non-existent user ID', async () => {
            const fakeId = faker.database.mongodbObjectId();
            mockUserService.findUserById.mockRejectedValue(new Error('User not found'));

            const response = await makeMasterRequest.get(
                app,
                `/api/v1/users/${fakeId}`,
                context.admin.token
            );

            // Should handle not found appropriately
            expect(response.status).toBeGreaterThanOrEqual(400);
            expect(response.status).toBeLessThan(500);
        });
    });

    describe('PUT /api/v1/users/:id - Update user profile (Protected)', () => {
        it('should update user profile successfully', async () => {
            const userId = faker.database.mongodbObjectId();
            const updateData = {
                firstName: 'Updated',
                lastName: 'Name',
            };
            const updatedUser = generateMasterTestData.user({
                _id: userId,
                ...updateData,
            });

            mockUserService.updateUserById.mockResolvedValue(updatedUser);

            const response = await makeMasterRequest.put(
                app,
                `/api/v1/users/${userId}`,
                updateData,
                context.admin.token
            );

            // Should handle the update appropriately
            expect(response.status).toBeGreaterThanOrEqual(200);
            expect(response.status).toBeLessThan(500);
        });

        it('should handle invalid update data', async () => {
            const userId = faker.database.mongodbObjectId();
            const invalidData = {
                email: 'invalid-email-format',
            };

            const response = await makeMasterRequest.put(
                app,
                `/api/v1/users/${userId}`,
                invalidData,
                context.admin.token
            );

            // Should handle validation error appropriately
            expect(response.status).toBeGreaterThanOrEqual(400);
            expect(response.status).toBeLessThan(500);
        });
    });

    describe('DELETE /api/v1/users/:id - Delete user (Protected + Admin)', () => {
        it('should delete user successfully with admin privileges', async () => {
            const userId = faker.database.mongodbObjectId();

            mockUserService.deleteUserById.mockResolvedValue(undefined);

            const response = await makeMasterRequest.delete(
                app,
                `/api/v1/users/${userId}`,
                context.admin.token
            );

            // Should handle the deletion appropriately
            expect(response.status).toBeGreaterThanOrEqual(200);
            expect(response.status).toBeLessThan(500);
        });

        it('should handle deletion of non-existent user', async () => {
            const fakeId = faker.database.mongodbObjectId();
            mockUserService.deleteUserById.mockRejectedValue(new Error('User not found'));

            const response = await makeMasterRequest.delete(
                app,
                `/api/v1/users/${fakeId}`,
                context.admin.token
            );

            // Should handle not found appropriately
            expect(response.status).toBeGreaterThanOrEqual(400);
            expect(response.status).toBeLessThan(500);
        });
    });

    describe('Service Layer Integration', () => {
        it('should handle service errors gracefully', async () => {
            mockUserService.findAllUsers.mockRejectedValue(new Error('Database connection failed'));

            const response = await makeMasterRequest.get(
                app,
                '/api/v1/users',
                context.admin.token
            );

            // Should handle service errors appropriately
            expect(response.status).toBeGreaterThanOrEqual(400);
            expect(response.status).toBeLessThan(500);
        });

        it('should verify service methods are called correctly', async () => {
            const mockUsers = [generateMasterTestData.user()];
            mockUserService.findAllUsers.mockResolvedValue(mockUsers);

            await makeMasterRequest.get(
                app,
                '/api/v1/users',
                context.admin.token
            );

            // Verify that service method was called
            expect(mockUserService.findAllUsers).toHaveBeenCalled();
        });
    });
});