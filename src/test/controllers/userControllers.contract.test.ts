/**
 * Contract Tests — Backend Response Shape Verification.
 *
 * These tests verify that login and register controllers emit the exact
 * response shape the frontend (Vegan-Guide-Platform) expects.
 *
 * If these tests break, it means the contract between FE and BE has drifted.
 * Fix the controller (or the frontend parser), then update the test.
 *
 * Expected shapes documented in: Vegan-Guide-Platform/src/lib/contracts/types.ts
 */

import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { testUtils } from '@test/helpers/testBase';

type ControllerFn = (req: Request, res: Response, next: NextFunction) => Promise<void> | void;

// Mock UserService so we can control what loginUser/registerUser/updateUserById return
const mockLoginUser = vi.fn();
const mockRegisterUser = vi.fn();
const mockUpdateUserById = vi.fn();

vi.mock('@/services/UserService.js', () => ({
    default: {
        loginUser: mockLoginUser,
        registerUser: mockRegisterUser,
        findAllUsers: vi.fn(),
        findUserById: vi.fn(),
        updateUserById: mockUpdateUserById,
        deleteUserById: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
    },
}));

// Mock User model for updateUserRole (needs findById to get previousRole)
const mockUserFindById = vi.fn();
vi.mock('@/models/User.js', () => ({
    User: { findById: mockUserFindById },
}));

vi.mock('@/utils/sanitizer.js', () => ({
    sanitizeNoSQLInput: (data: unknown) => data,
}));

vi.mock('@/utils/logger.js', () => ({
    default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Fixtures — what UserService returns for successful auth
// ---------------------------------------------------------------------------

const mockLoginResult = {
    _id: '64f8e2a1c9d4b5e6f7890123',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    photo: 'https://example.com/photo.jpg',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
    refreshToken: 'refresh-token-value',
};

const BASE_LOGIN_BODY = { email: 'test@example.com', password: 'TestPass123!' };
const BASE_REGISTER_BODY = { username: 'newuser', email: 'new@example.com', password: 'TestPass123!' };

// ---------------------------------------------------------------------------
// Shared test utilities
// ---------------------------------------------------------------------------

/** Returns the first argument passed to res.json() — works for any mock response.
 *  Throws a descriptive error if res.json was never called, so test failures are actionable. */
const getJsonResponse = (res: Response) => {
    const calls = (res.json as ReturnType<typeof vi.fn>).mock.calls;
    if (!calls || calls.length === 0) {
        throw new Error('res.json was never called — controller did not send a response');
    }
    return calls[0][0];
};

/** Creates fresh mock res + next for each test. */
const createMocks = () => ({
    res: testUtils.createMockResponse() as Response,
    next: testUtils.createMockNext() as NextFunction,
});

// ---------------------------------------------------------------------------
// loginUser — contract test
// ---------------------------------------------------------------------------

describe('loginUser controller — response contract', () => {
    let loginUser: ControllerFn;
    let res: Response;
    let next: NextFunction;

    beforeAll(async () => {
        ({ loginUser } = await import('@/controllers/userControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockLoginUser.mockResolvedValue(mockLoginResult);
        ({ res, next } = createMocks());
    });

    it('wraps response in { success, message, data } envelope', async () => {
        const req = testUtils.createMockRequest({ body: BASE_LOGIN_BODY }) as Request;
        await loginUser(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        const jsonCall = getJsonResponse(res);
        // Verify the { success, message, data } wrapper — required by FE parser
        expect(jsonCall).toHaveProperty('success', true);
        expect(jsonCall).toHaveProperty('message', 'Login successful');
        expect(jsonCall).toHaveProperty('data');
    });

    it('places user fields directly in data (flat, not nested under data.user)', async () => {
        const req = testUtils.createMockRequest({ body: BASE_LOGIN_BODY }) as Request;
        await loginUser(req, res, next);

        const { data } = getJsonResponse(res);
        // FE auth.ts reads: response.data._id, response.data.username, etc.
        expect(data).toHaveProperty('_id', mockLoginResult._id);
        expect(data).toHaveProperty('username', mockLoginResult.username);
        expect(data).toHaveProperty('email', mockLoginResult.email);
        expect(data).toHaveProperty('role', mockLoginResult.role);
        expect(data).toHaveProperty('token');
        expect(data).toHaveProperty('refreshToken');
        // Verify it is NOT nested under a 'user' key (old broken format)
        expect(data).not.toHaveProperty('user');
    });

    it('returns 200 status code', async () => {
        const req = testUtils.createMockRequest({ body: BASE_LOGIN_BODY }) as Request;
        await loginUser(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
    });
});

// ---------------------------------------------------------------------------
// registerUser — contract test
// ---------------------------------------------------------------------------

describe('registerUser controller — response contract', () => {
    let registerUser: ControllerFn;
    let res: Response;
    let next: NextFunction;

    beforeAll(async () => {
        ({ registerUser } = await import('@/controllers/userControllers.js'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockRegisterUser.mockResolvedValue(mockLoginResult);
        ({ res, next } = createMocks());
    });

    it('wraps response in { success, message, data } envelope', async () => {
        const req = testUtils.createMockRequest({ body: BASE_REGISTER_BODY }) as Request;
        await registerUser(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        const jsonCall = getJsonResponse(res);
        expect(jsonCall).toHaveProperty('success', true);
        expect(jsonCall).toHaveProperty('message', 'User registered successfully');
        expect(jsonCall).toHaveProperty('data');
    });

    it('places user fields directly in data (flat, not nested)', async () => {
        const req = testUtils.createMockRequest({ body: BASE_REGISTER_BODY }) as Request;
        await registerUser(req, res, next);

        const { data } = getJsonResponse(res);
        expect(data).toHaveProperty('_id');
        expect(data).toHaveProperty('username');
        expect(data).toHaveProperty('email');
        expect(data).toHaveProperty('role');
        expect(data).not.toHaveProperty('user'); // must NOT be nested
    });

    it('strips the role field from incoming body (privilege escalation prevention)', async () => {
        mockRegisterUser.mockResolvedValue({ ...mockLoginResult, role: 'user' });
        const req = testUtils.createMockRequest({
            body: { ...BASE_REGISTER_BODY, username: 'hacker', email: 'hacker@example.com', role: 'admin' },
        }) as Request;
        await registerUser(req, res, next);

        // Controller strips role before passing to service
        // Hard assertion: service must have been called exactly once —
        // if it wasn't, the security boundary was never exercised and the test must fail.
        expect(mockRegisterUser).toHaveBeenCalledTimes(1);
        const serviceCallArg = mockRegisterUser.mock.calls[0][0];
        expect(serviceCallArg.role).toBeUndefined();
    });

    // Defense-in-depth: these tests call the controller directly (Joi bypassed)
    // to verify REGISTER_ALLOWED_ROLES works independently of the validation layer.

    it.each([
        { role: 'professional', username: 'pro', email: 'pro@example.com' },
        { role: 'user', username: 'usr', email: 'usr@example.com' },
    ])(
        'passes role: $role to service (whitelisted role, controller-level check)',
        async ({ role, username, email }) => {
            mockRegisterUser.mockResolvedValue({ ...mockLoginResult, role });
            const req = testUtils.createMockRequest({
                body: { username, email, password: 'TestPass123!', role },
            }) as Request;
            await registerUser(req, res, next);

            expect(mockRegisterUser).toHaveBeenCalledTimes(1);
            expect(mockRegisterUser.mock.calls[0][0].role).toBe(role);
        }
    );

    it('omits role from service call when role is absent from body (model default applies)', async () => {
        const req = testUtils.createMockRequest({ body: BASE_REGISTER_BODY }) as Request;
        await registerUser(req, res, next);

        expect(mockRegisterUser).toHaveBeenCalledTimes(1);
        expect(mockRegisterUser.mock.calls[0][0].role).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// updateUserRole — audit log action field contract test
// ---------------------------------------------------------------------------

describe('updateUserRole controller — audit log action field', () => {
    let updateUserRole: ControllerFn;
    let mockLogger: { info: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn> };
    let res: Response;
    let next: NextFunction;

    beforeAll(async () => {
        [{ updateUserRole }, { default: mockLogger }] = await Promise.all([
            import('@/controllers/userControllers.js'),
            import('@/utils/logger.js'),
        ]);
    });

    beforeEach(() => {
        vi.clearAllMocks();
        ({ res, next } = createMocks());
    });

    it.each([
        { previousRole: 'user', newRole: 'admin', expectedAction: 'role_escalation' },
        { previousRole: 'user', newRole: 'professional', expectedAction: 'role_escalation' },
        { previousRole: 'professional', newRole: 'admin', expectedAction: 'role_escalation' },
        { previousRole: 'admin', newRole: 'user', expectedAction: 'role_demotion' },
        { previousRole: 'admin', newRole: 'professional', expectedAction: 'role_demotion' },
        { previousRole: 'professional', newRole: 'user', expectedAction: 'role_demotion' },
        { previousRole: 'user', newRole: 'user', expectedAction: 'role_unchanged' },
        { previousRole: 'professional', newRole: 'professional', expectedAction: 'role_unchanged' },
        { previousRole: 'admin', newRole: 'admin', expectedAction: 'role_unchanged' },
    ])(
        'logs action: $expectedAction when role changes $previousRole → $newRole',
        async ({ previousRole, newRole, expectedAction }) => {
            mockUserFindById.mockResolvedValue({ _id: 'target123', role: previousRole });
            mockUpdateUserById.mockResolvedValue({ _id: 'target123', role: newRole });

            const req = testUtils.createMockRequest({
                params: { id: 'target123' },
                body: { role: newRole },
                user: { _id: 'admin1', role: 'admin', email: 'admin@test.com', isActive: true },
            }) as Request;

            await updateUserRole(req, res, next);

            const infoCalls = mockLogger.info.mock.calls;
            const roleUpdateCall = infoCalls.find(([, meta]) => meta?.previousRole !== undefined);
            expect(roleUpdateCall).toBeDefined();
            expect(roleUpdateCall![1]).toMatchObject({
                previousRole,
                newRole,
                action: expectedAction,
            });
        }
    );
});

// ---------------------------------------------------------------------------
// Unlike route — contract test
// ---------------------------------------------------------------------------

const mockUnlikePost = vi.fn();

vi.mock('@/services/PostService.js', () => ({
    postService: {
        getAll: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
        updateById: vi.fn(),
        deleteById: vi.fn(),
        likePost: vi.fn(),
        unlikePost: mockUnlikePost,
        addComment: vi.fn(),
        removeComment: vi.fn(),
    },
}));

describe('unlikePost controller — route contract (DELETE /posts/:id/likes)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('accepts :id from params (not from a /unlike/:id style route)', async () => {
        const { unlikePost } = await import('@/controllers/postControllers.js');
        mockUnlikePost.mockResolvedValue([]);

        // The backend route is: DELETE /posts/:id/likes
        // Router passes id via req.params.id
        const req = testUtils.createMockRequest({
            params: { id: 'post123' },
            user: { _id: 'user1', role: 'user', email: 'test@test.com', isActive: true },
        }) as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext() as NextFunction;

        await unlikePost(req, res, next);

        expect(mockUnlikePost).toHaveBeenCalledWith('post123', 'user1');
        expect(res.status).toHaveBeenCalledWith(200);
    });
});

// ---------------------------------------------------------------------------
// addComment — contract test
// ---------------------------------------------------------------------------

const mockAddComment = vi.fn();

describe('addComment controller — payload contract ({ text } not { content })', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAddComment.mockResolvedValue({ text: 'A comment', _id: 'c1' });
    });

    it('reads text from req.body.text', async () => {
        // Import fresh to pick up the PostService mock
        const postControllers = await import('@/controllers/postControllers.js');

        // Patch the service's addComment for this test
        const PostServiceModule = await import('@/services/PostService.js');
        (PostServiceModule.postService.addComment as ReturnType<typeof vi.fn>).mockResolvedValue({
            text: 'A comment',
            _id: 'c1',
        });

        const req = testUtils.createMockRequest({
            params: { id: 'post123' },
            body: { text: 'A comment' }, // FE now sends "text", not "content"
            user: { _id: 'user1', role: 'user', email: 'test@test.com', isActive: true },
        }) as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext() as NextFunction;

        await postControllers.addComment(req, res, next);

        // Controller must call service with (postId, userId, text)
        const serviceCall = (PostServiceModule.postService.addComment as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(serviceCall).toBeDefined();
        // The text value must come from req.body.text
        expect(serviceCall?.[2]).toBe('A comment');
    });
});
