import request from 'supertest';
import express from 'express';
import { connect, closeDatabase, clearDatabase } from './helpers/testDb';
import { createTestUser, createAdminUser, generateAuthTokens } from './helpers/testFixtures';
import app from '../../app';
import { User } from '../../models/User';
import TokenService from '../../services/TokenService';
import bcrypt from 'bcryptjs';
import { testConfig } from '../config/testConfig';
import { generateExpiredToken } from '../utils/testHelpers';

// Helper functions to reduce duplication
const expectUnauthorizedResponse = (response: any) => {
  expect(response.status).toBe(401);
  expect(response.body.success).toBe(false);
};

const expectBadRequestResponse = (response: any) => {
  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
};

const expectSuccessResponse = (response: any, expectedStatus: number = 200) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body.success).toBe(true);
};

describe('Authentication Flow Integration Tests', () => {
  beforeAll(async () => {
    await connect();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('POST /api/v1/users/register', () => {
    it('should register a new user and return JWT tokens', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: testConfig.passwords.validPassword,
        role: 'user'
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(userData);

      expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data.user).not.toHaveProperty('password');

      // Verify user was created in database
      const user = await User.findOne({ email: userData.email });
      expect(user).toBeTruthy();
      expect(user?.username).toBe(userData.username);
      
      // Verify password was hashed
      const isPasswordValid = await bcrypt.compare(userData.password, user?.password || '');
      expect(isPasswordValid).toBe(true);
    });

    it('should prevent duplicate email registration', async () => {
      const userData = {
        username: 'testuser',
        email: 'duplicate@example.com',
        password: testConfig.passwords.validPassword,
        role: 'user'
      };

      // First registration
      await request(app)
        .post('/api/v1/users/register')
        .send(userData);

      // Attempt duplicate registration
      const response = await request(app)
        .post('/api/v1/users/register')
        .send({
          ...userData,
          username: 'different'
        });

      expectBadRequestResponse(response);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate email format', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: testConfig.passwords.validPassword,
        role: 'user'
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(userData);

      expectBadRequestResponse(response);
      expect(response.body.error).toContain('email');
    });

    it('should validate password strength', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: testConfig.passwords.weakPassword,
        role: 'user'
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(userData);

      expectBadRequestResponse(response);
      expect(response.body.error).toContain('password');
    });
  });

  describe('POST /api/v1/users/login', () => {
    let testUser: any;
    const password = testConfig.passwords.validPassword;

    beforeEach(async () => {
      testUser = await createTestUser({
        password: await bcrypt.hash(password, 10)
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: testUser.email,
          password: password
        });

      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user._id).toBe(testUser._id.toString());
    });

    it('should return access and refresh tokens', async () => {
      const response = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: testUser.email,
          password: password
        });

      expect(response.status).toBe(200);
      
      const { accessToken, refreshToken } = response.body.data;
      
      // Verify tokens are valid
      const accessPayload = await TokenService.verifyAccessToken(accessToken);
      expect(accessPayload.userId).toBe(testUser._id.toString());
      expect(accessPayload.email).toBe(testUser.email);
      
      const refreshPayload = await TokenService.verifyRefreshToken(refreshToken);
      expect(refreshPayload.userId).toBe(testUser._id.toString());
    });

    it('should fail with invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: testUser.email,
          password: testConfig.passwords.wrongPassword
        });

      expectUnauthorizedResponse(response);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should fail with non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'nonexistent@example.com',
          password: testConfig.passwords.validPassword
        });

      expectUnauthorizedResponse(response);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should handle rate limiting', async () => {
      // Make multiple failed login attempts
      const promises = Array(15).fill(null).map(() => 
        request(app)
          .post('/api/v1/users/login')
          .send({
            email: testUser.email,
            password: testConfig.passwords.wrongPassword
          })
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    let testUser: any;
    let tokens: any;

    beforeEach(async () => {
      testUser = await createTestUser();
      tokens = await generateAuthTokens(
        testUser._id.toString(),
        testUser.email,
        testUser.role
      );
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({
          refreshToken: tokens.refreshToken
        });

      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      
      // New access token should be different
      expect(response.body.data.accessToken).not.toBe(tokens.accessToken);
    });

    it('should invalidate old refresh token', async () => {
      // Use refresh token once
      await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({
          refreshToken: tokens.refreshToken
        });

      // Try to use same refresh token again
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({
          refreshToken: tokens.refreshToken
        });

      expectUnauthorizedResponse(response);
      expect(response.body.message).toContain('Invalid refresh token');
    });

    it('should handle blacklisted tokens', async () => {
      // Blacklist the token
      await TokenService.blacklistToken(tokens.refreshToken);

      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({
          refreshToken: tokens.refreshToken
        });

      expectUnauthorizedResponse(response);
    });

    it('should reject invalid refresh token format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({
          refreshToken: 'invalid.token.format'
        });

      expectUnauthorizedResponse(response);
      expect(response.body.message).toContain('Invalid refresh token');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let testUser: any;
    let tokens: any;

    beforeEach(async () => {
      testUser = await createTestUser();
      tokens = await generateAuthTokens(
        testUser._id.toString(),
        testUser.email,
        testUser.role
      );
    });

    it('should logout and blacklist token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expectSuccessResponse(response);
      expect(response.body.message).toBe('Logged out successfully');

      // Verify token is blacklisted
      const isBlacklisted = await TokenService.isTokenBlacklisted(tokens.accessToken);
      expect(isBlacklisted).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout');

      expectUnauthorizedResponse(response);
    });
  });

  describe('POST /api/v1/auth/revoke-all-tokens', () => {
    let testUser: any;
    let tokens: any;

    beforeEach(async () => {
      testUser = await createTestUser();
      tokens = await generateAuthTokens(
        testUser._id.toString(),
        testUser.email,
        testUser.role
      );
    });

    it('should revoke all user tokens', async () => {
      const response = await request(app)
        .post('/api/v1/auth/revoke-all-tokens')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expectSuccessResponse(response);
      expect(response.body.message).toBe('All tokens revoked successfully');

      // Verify user tokens are revoked
      const areRevoked = await TokenService.isUserTokensRevoked(testUser._id.toString());
      expect(areRevoked).toBe(true);
    });

    it('should require authentication for token revocation', async () => {
      const response = await request(app)
        .post('/api/v1/auth/revoke-all-tokens');

      expectUnauthorizedResponse(response);
    });
  });

  describe('Protected Routes', () => {
    let testUser: any;
    let adminUser: any;
    let userTokens: any;
    let adminTokens: any;

    beforeEach(async () => {
      testUser = await createTestUser();
      adminUser = await createAdminUser();
      
      userTokens = await generateAuthTokens(
        testUser._id.toString(),
        testUser.email,
        testUser.role
      );
      
      adminTokens = await generateAuthTokens(
        adminUser._id.toString(),
        adminUser.email,
        adminUser.role
      );
    });

    it('should allow access with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${userTokens.accessToken}`);

      expectSuccessResponse(response);
      expect(response.body.data._id).toBe(testUser._id.toString());
    });

    it('should deny access without token', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile');

      expectUnauthorizedResponse(response);
      expect(response.body.message).toContain('Not authorized');
    });

    it('should deny access with expired token', async () => {
      // Create an expired token using the helper function
      const expiredToken = generateExpiredToken();

      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expectUnauthorizedResponse(response);
    });

    it('should enforce admin role requirements', async () => {
      // Try to access admin route as regular user
      const response = await request(app)
        .get('/api/v1/users') // Admin only route
        .set('Authorization', `Bearer ${userTokens.accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Admin access required');
    });

    it('should allow admin access to admin routes', async () => {
      const response = await request(app)
        .get('/api/v1/users') // Admin only route
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);

      expectSuccessResponse(response);
    });
  });
});