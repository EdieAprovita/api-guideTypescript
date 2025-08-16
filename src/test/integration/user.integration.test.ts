/**
 * User API Integration Tests
 * Simplified and reliable integration tests for user endpoints
 */

import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../../app';
import { User } from '../../models/User';
import { setupIntegrationTest } from './helpers/simple-test-setup';
import {
  createTestUserData,
  createAdminUserData,
  hashPassword,
  generateTestTokens,
  createAuthHeaders,
  expectSuccessResponse,
  expectErrorResponse,
  expectUnauthorizedResponse,
  expectNotFoundResponse,
} from './helpers/simple-test-helpers';

describe('User API Integration Tests', () => {
  setupIntegrationTest();

  describe('POST /api/v1/users/register', () => {
    it('should register a new user with valid data', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .set('User-Agent', 'test-agent')
        .set('API-Version', 'v1')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.username).toBe(userData.username);
      expect(response.body.data.password).toBeUndefined(); // Password should not be returned
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'TestPassword123!',
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .set('User-Agent', 'test-agent')
        .set('API-Version', 'v1')
        .send(userData);

      expectErrorResponse(response, 400);
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123', // Too weak
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .set('User-Agent', 'test-agent')
        .set('API-Version', 'v1')
        .send(userData);

      expectErrorResponse(response, 400);
    });

    it('should reject registration with duplicate email', async () => {
      const userData = createTestUserData();
      const hashedPassword = await hashPassword(userData.password);

      // Create user first
      await User.create({
        ...userData,
        password: hashedPassword,
      });

      // Try to register with same email
      const duplicateUserData = {
        username: 'differentuser',
        email: userData.email, // Same email
        password: 'TestPassword123!',
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .set('User-Agent', 'test-agent')
        .set('API-Version', 'v1')
        .send(duplicateUserData);

      expectErrorResponse(response, 400);
    });
  });

  describe('POST /api/v1/users/login', () => {
    it('should login with valid credentials', async () => {
      const userData = createTestUserData();
      const hashedPassword = await hashPassword(userData.password);

      await User.create({
        ...userData,
        password: hashedPassword,
      });

      const loginData = {
        email: userData.email,
        password: userData.password,
      };

      const response = await request(app)
        .post('/api/v1/users/login')
        .set('User-Agent', 'test-agent')
        .set('API-Version', 'v1')
        .send(loginData);

      expectSuccessResponse(response);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.token || response.body.token).toBeDefined();
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!',
      };

      const response = await request(app)
        .post('/api/v1/users/login')
        .set('User-Agent', 'test-agent')
        .set('API-Version', 'v1')
        .send(loginData);

      expectErrorResponse(response, 401);
    });

    it('should reject login with invalid password', async () => {
      const userData = createTestUserData();
      const hashedPassword = await hashPassword(userData.password);

      await User.create({
        ...userData,
        password: hashedPassword,
      });

      const loginData = {
        email: userData.email,
        password: 'WrongPassword123!',
      };

      const response = await request(app)
        .post('/api/v1/users/login')
        .set('User-Agent', 'test-agent')
        .set('API-Version', 'v1')
        .send(loginData);

      expectErrorResponse(response, 401);
    });
  });

  describe('GET /api/v1/users', () => {
    it('should require admin authentication', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('User-Agent', 'test-agent')
        .set('API-Version', 'v1');

      expectUnauthorizedResponse(response);
    });

    it('should return users list for admin', async () => {
      // Create admin user
      const adminData = createAdminUserData();
      const hashedPassword = await hashPassword(adminData.password);

      const admin = await User.create({
        ...adminData,
        password: hashedPassword,
      });

      // Create regular user
      const userData = createTestUserData();
      const userHashedPassword = await hashPassword(userData.password);

      await User.create({
        ...userData,
        password: userHashedPassword,
      });

      const tokens = generateTestTokens(admin._id.toString(), admin.email, admin.role);
      const authHeaders = createAuthHeaders(tokens.accessToken);

      const response = await request(app)
        .get('/api/v1/users')
        .set(authHeaders);

      expectSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should require authentication', async () => {
      const userId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .get(`/api/v1/users/${userId}`)
        .set('User-Agent', 'test-agent')
        .set('API-Version', 'v1');

      expectUnauthorizedResponse(response);
    });

    it('should return user by ID with authentication', async () => {
      const userData = createTestUserData();
      const hashedPassword = await hashPassword(userData.password);

      const user = await User.create({
        ...userData,
        password: hashedPassword,
      });

      const tokens = generateTestTokens(user._id.toString(), user.email, user.role);
      const authHeaders = createAuthHeaders(tokens.accessToken);

      const response = await request(app)
        .get(`/api/v1/users/${user._id}`)
        .set(authHeaders);

      expectSuccessResponse(response);
      expect(response.body.data._id).toBe(user._id.toString());
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.password).toBeUndefined(); // Password should not be returned
    });

    it('should return 404 for non-existent user', async () => {
      const userData = createTestUserData();
      const hashedPassword = await hashPassword(userData.password);

      const user = await User.create({
        ...userData,
        password: hashedPassword,
      });

      const tokens = generateTestTokens(user._id.toString(), user.email, user.role);
      const authHeaders = createAuthHeaders(tokens.accessToken);

      const nonExistentId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .get(`/api/v1/users/${nonExistentId}`)
        .set(authHeaders);

      expectNotFoundResponse(response);
    });
  });

  describe('PUT /api/v1/users/:id', () => {
    it('should require authentication', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const updateData = { username: 'updateduser' };

      const response = await request(app)
        .put(`/api/v1/users/${userId}`)
        .set('User-Agent', 'test-agent')
        .set('API-Version', 'v1')
        .send(updateData);

      expectUnauthorizedResponse(response);
    });

    it('should update user with valid data and authentication', async () => {
      const userData = createTestUserData();
      const hashedPassword = await hashPassword(userData.password);

      const user = await User.create({
        ...userData,
        password: hashedPassword,
      });

      const tokens = generateTestTokens(user._id.toString(), user.email, user.role);
      const authHeaders = createAuthHeaders(tokens.accessToken);

      const updateData = { username: 'updateduser' };

      const response = await request(app)
        .put(`/api/v1/users/${user._id}`)
        .set(authHeaders)
        .send(updateData);

      expectSuccessResponse(response);
      expect(response.body.data.username).toBe(updateData.username);
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('should require admin authentication', async () => {
      const userId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .delete(`/api/v1/users/${userId}`)
        .set('User-Agent', 'test-agent')
        .set('API-Version', 'v1');

      expectUnauthorizedResponse(response);
    });

    it('should delete user with admin authentication', async () => {
      // Create admin user
      const adminData = createAdminUserData();
      const hashedPassword = await hashPassword(adminData.password);

      const admin = await User.create({
        ...adminData,
        password: hashedPassword,
      });

      // Create user to delete
      const userData = createTestUserData();
      const userHashedPassword = await hashPassword(userData.password);

      const user = await User.create({
        ...userData,
        password: userHashedPassword,
      });

      const tokens = generateTestTokens(admin._id.toString(), admin.email, admin.role);
      const authHeaders = createAuthHeaders(tokens.accessToken);

      const response = await request(app)
        .delete(`/api/v1/users/${user._id}`)
        .set(authHeaders);

      expectSuccessResponse(response);

      // Verify user was deleted or marked as deleted
      const deletedUser = await User.findById(user._id);
      expect(deletedUser === null || deletedUser.isDeleted === true).toBe(true);
    });
  });
});