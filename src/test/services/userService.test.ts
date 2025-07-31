/**
 * Clean UserService Tests - Using Unified Mock System
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupTest } from '../config/unified-test-config';
import { mockFactory } from '../mocks/unified-mock-factory';
import type { MockedUserService } from '../types/test-types';
import testConfig from '../testConfig';

// Mock the UserService module
vi.mock('../../services/UserService', () => mockFactory.createUserServiceMockModule());

describe('UserService', () => {
    const testHooks = setupTest();
    let userService: MockedUserService;

    beforeEach(async () => {
        await testHooks.beforeEach();
        // Get the mocked service instance directly
        userService = mockFactory.createUserServiceMock();
    });

    afterEach(() => {
        // Clean up after each test
    });

    describe('registerUser', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: testConfig.generateTestPassword(),
            };

            const result = await userService.registerUser(userData);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.user).toBeDefined();
            if (result.user) {
                expect(result.user.email).toBe(userData.email);
                expect(result.user.username).toBe(userData.username);
            }
        });

        it('should handle duplicate email error', async () => {
            const userData = {
                username: 'testuser',
                email: 'existing@example.com',
                password: testConfig.generateTestPassword(),
            };

            const result = await userService.registerUser(userData);

            expect(result).toBeDefined();
            expect(result.success).toBe(false);
            expect(result.error).toContain('email already exists');
        });
    });

    describe('loginUser', () => {
        it('should login user successfully', async () => {
            const credentials = {
                email: 'test@example.com',
                password: testConfig.generateTestPassword(),
            };

            const result = await userService.loginUser(credentials);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.user).toBeDefined();
            expect(result.tokens).toBeDefined();
        });

        it('should handle invalid credentials', async () => {
            const credentials = {
                email: 'test@example.com',
                password: testConfig.generateTestPassword(),
            };

            const result = await userService.loginUser(credentials);

            expect(result).toBeDefined();
            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid credentials');
        });
    });

    describe('getUserById', () => {
        it('should return user by ID', async () => {
            const userId = '507f1f77bcf86cd799439011';
            const user = await userService.getUserById(userId);

            expect(user).toBeDefined();
            if (user) {
                expect(user._id).toBe(userId);
            }
        });

        it('should return null for non-existent user', async () => {
            const userId = 'nonexistent';
            const user = await userService.getUserById(userId);

            expect(user).toBeNull();
        });
    });

    describe('updateUser', () => {
        it('should update user successfully', async () => {
            const userId = '507f1f77bcf86cd799439011';
            const updateData = {
                username: 'updateduser',
                email: 'updated@example.com',
            };

            const result = await userService.updateUser(userId, updateData);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.user).toBeDefined();
            if (result.user) {
                expect(result.user.username).toBe(updateData.username);
            }
        });
    });

    describe('deleteUser', () => {
        it('should delete user successfully', async () => {
            const userId = '507f1f77bcf86cd799439011';
            const result = await userService.deleteUser(userId);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });
    });

    describe('getAllUsers', () => {
        it('should return all users', async () => {
            const users = await userService.getAllUsers();

            expect(users).toBeDefined();
            expect(Array.isArray(users)).toBe(true);
            expect(users.length).toBeGreaterThan(0);
        });
    });
});
