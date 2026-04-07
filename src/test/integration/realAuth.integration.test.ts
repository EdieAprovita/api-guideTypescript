/**
 * Real Auth Integration Tests
 *
 * Exercises the actual protect/admin middleware without BYPASS_AUTH_FOR_TESTING.
 * These tests run in CI under the test:integration:auth job (no bypass env var).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { User } from '../../models/User.js';
import app from '../../app.js';

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

const JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-key-12345';

/**
 * Signs a JWT that the real TokenService.verifyAccessToken will accept.
 * The issuer/audience must match what TokenService uses.
 */
const signToken = (payload: { userId: string; email: string; role: string }, options: jwt.SignOptions = {}): string => {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: '1h',
        issuer: 'vegan-guide-api',
        audience: 'vegan-guide-client',
        ...options,
    });
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ADMIN_ID = new Types.ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb');
const USER_ID = new Types.ObjectId('cccccccccccccccccccccccc');

beforeEach(async () => {
    // Re-seed users after the global clearDatabase() in integration-setup.ts.
    const [existingAdmin, existingUser] = await Promise.all([User.findById(ADMIN_ID), User.findById(USER_ID)]);

    if (!existingAdmin) {
        const admin = new User({
            _id: ADMIN_ID,
            username: 'realauth_admin',
            email: 'realauth_admin@test.com',
            password: 'AdminPass123!',
            role: 'admin',
        });
        await admin.save();
    }

    if (!existingUser) {
        const user = new User({
            _id: USER_ID,
            username: 'realauth_user',
            email: 'realauth_user@test.com',
            password: 'UserPass123!',
            role: 'user',
        });
        await user.save();
    }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Real Auth Middleware — protect', () => {
    it('returns 401 when no token is provided', async () => {
        const res = await request(app).get('/api/v1/users/profile');

        expect(res.status).toBe(401);
        expect(res.body).toMatchObject({ success: false });
        expect(res.body.message).toBeDefined();
    });

    it('returns 401 with a structurally invalid token', async () => {
        const res = await request(app).get('/api/v1/users/profile').set('Authorization', 'Bearer not.a.jwt');

        expect(res.status).toBe(401);
        expect(res.body).toMatchObject({ success: false });
    });

    it('returns 401 with a token signed by a wrong secret (tampered)', async () => {
        const tamperedToken = jwt.sign(
            { userId: USER_ID.toString(), email: 'realauth_user@test.com', role: 'user' },
            'wrong-secret',
            { expiresIn: '1h', issuer: 'vegan-guide-api', audience: 'vegan-guide-client' }
        );

        const res = await request(app).get('/api/v1/users/profile').set('Authorization', `Bearer ${tamperedToken}`);

        expect(res.status).toBe(401);
        expect(res.body).toMatchObject({ success: false });
    });

    it('returns 401 with an expired token', async () => {
        const expiredToken = signToken(
            { userId: USER_ID.toString(), email: 'realauth_user@test.com', role: 'user' },
            { expiresIn: -1 } // already expired
        );

        const res = await request(app).get('/api/v1/users/profile').set('Authorization', `Bearer ${expiredToken}`);

        expect(res.status).toBe(401);
        expect(res.body).toMatchObject({ success: false });
    });
});

describe('Real Auth Middleware — admin', () => {
    it('returns 403 when a regular user token hits an admin-only endpoint', async () => {
        const userToken = signToken({
            userId: USER_ID.toString(),
            email: 'realauth_user@test.com',
            role: 'user',
        });

        // GET /api/v1/users is protect + admin guarded
        const res = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(403);
        expect(res.body).toMatchObject({ success: false });
        expect(res.body.message).toBeDefined();
    });

    it('returns 200 when a valid admin token hits an admin-only endpoint', async () => {
        const adminToken = signToken({
            userId: ADMIN_ID.toString(),
            email: 'realauth_admin@test.com',
            role: 'admin',
        });

        const res = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${adminToken}`);

        // 200 means the middleware chain passed; response shape may include pagination
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ success: true });
    });
});
