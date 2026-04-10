import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { HttpStatusCode } from '../../types/Errors.js';

// ---------------------------------------------------------------------------
// vi.hoisted ensures these are available when the vi.mock factories run
// (vi.mock calls are hoisted to the top of the file by vitest's transformer)
// ---------------------------------------------------------------------------
const { mockFindOneAndUpdate, mockFindOne, mockFind, mockCountDocuments } = vi.hoisted(() => ({
    mockFindOneAndUpdate: vi.fn(),
    mockFindOne: vi.fn(),
    mockFind: vi.fn(),
    mockCountDocuments: vi.fn(),
}));

vi.mock('../../models/User.js', () => ({
    User: {
        findOneAndUpdate: mockFindOneAndUpdate,
        findOne: mockFindOne,
        find: mockFind,
        countDocuments: mockCountDocuments,
        create: vi.fn(),
    },
}));

vi.mock('../../services/TokenService.js', () => ({
    default: {
        generateTokens: vi.fn().mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' }),
        verifyAccessToken: vi.fn(),
        isUserTokensRevoked: vi.fn().mockResolvedValue(false),
        revokeAllUserTokens: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('jsonwebtoken', () => ({
    default: {
        sign: vi.fn().mockReturnValue('signed-token'),
        verify: vi.fn(),
    },
}));

vi.mock('nodemailer', () => ({
    default: { createTransport: vi.fn().mockReturnValue({ sendMail: vi.fn() }) },
}));

vi.mock('../../utils/logger.js', () => ({
    default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// Import AFTER all mocks are registered
import UserService from '../../services/UserService.js';
import TokenService from '../../services/TokenService.js';
import jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function chainableMock(resolvedValue: unknown) {
    return { exec: vi.fn().mockResolvedValue(resolvedValue) };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('UserService — soft delete (BE-03)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // -----------------------------------------------------------------------
    // deleteUserById
    // -----------------------------------------------------------------------
    describe('deleteUserById', () => {
        it('sets isDeleted=true and isActive=false instead of hard-deleting the document', async () => {
            const fakeUser = { _id: 'user-123', isDeleted: true, isActive: false };
            mockFindOneAndUpdate.mockReturnValue(chainableMock(fakeUser));

            const result = await UserService.deleteUserById('user-123');

            expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
                { _id: 'user-123', isDeleted: false },
                { isDeleted: true, isActive: false },
                { new: true }
            );
            expect(result).toEqual({ message: 'User deleted successfully' });
        });

        it('throws NOT_FOUND when no active user matches the id', async () => {
            mockFindOneAndUpdate.mockReturnValue(chainableMock(null));

            await expect(UserService.deleteUserById('nonexistent')).rejects.toMatchObject({
                statusCode: HttpStatusCode.NOT_FOUND,
            });
        });

        it('throws NOT_FOUND when the user is already soft-deleted', async () => {
            // The { isDeleted: false } filter means already-deleted users return null
            mockFindOneAndUpdate.mockReturnValue(chainableMock(null));

            await expect(UserService.deleteUserById('already-deleted')).rejects.toMatchObject({
                statusCode: HttpStatusCode.NOT_FOUND,
            });
        });
    });

    // -----------------------------------------------------------------------
    // findAllUsers
    // -----------------------------------------------------------------------
    describe('findAllUsers', () => {
        it('always includes isDeleted=false in the filter to exclude soft-deleted users', async () => {
            mockCountDocuments.mockResolvedValue(0);
            mockFind.mockReturnValue({
                sort: vi.fn().mockReturnThis(),
                skip: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue([]),
            });

            await UserService.findAllUsers({ page: 1, limit: 10 });

            const filterArg = mockCountDocuments.mock.calls[0][0] as Record<string, unknown>;
            expect(filterArg).toMatchObject({ isDeleted: false });
        });

        it('merges isDeleted=false with search $or filter when search is provided', async () => {
            mockCountDocuments.mockResolvedValue(0);
            mockFind.mockReturnValue({
                sort: vi.fn().mockReturnThis(),
                skip: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue([]),
            });

            await UserService.findAllUsers({ page: 1, limit: 10, search: 'alice' });

            const filterArg = mockCountDocuments.mock.calls[0][0] as Record<string, unknown>;
            expect(filterArg).toMatchObject({ isDeleted: false });
            expect(filterArg).toHaveProperty('$or');
        });
    });

    // -----------------------------------------------------------------------
    // findUserById
    // -----------------------------------------------------------------------
    describe('findUserById', () => {
        it('queries with isDeleted=false to exclude soft-deleted users', async () => {
            const fakeUser = { _id: 'user-abc', isDeleted: false };
            mockFindOne.mockReturnValue(chainableMock(fakeUser));

            const result = await UserService.findUserById('user-abc');

            expect(mockFindOne).toHaveBeenCalledWith({ _id: 'user-abc', isDeleted: false });
            expect(result).toEqual(fakeUser);
        });

        it('returns null when the user is soft-deleted (findOne returns null)', async () => {
            mockFindOne.mockReturnValue(chainableMock(null));

            const result = await UserService.findUserById('deleted-user');

            expect(result).toBeNull();
        });

        it('throws UserIdRequiredError when userId is empty string', async () => {
            await expect(UserService.findUserById('')).rejects.toThrow();
            expect(mockFindOne).not.toHaveBeenCalled();
        });
    });

    // -----------------------------------------------------------------------
    // loginUser — BE-03 follow-up: soft-deleted users must not authenticate
    // -----------------------------------------------------------------------
    describe('loginUser (soft-delete regression)', () => {
        function selectChain(resolvedValue: unknown) {
            return {
                select: vi.fn().mockReturnValue({
                    exec: vi.fn().mockResolvedValue(resolvedValue),
                }),
            };
        }

        it('filters by isDeleted=false so soft-deleted users cannot log in', async () => {
            // User.findOne must be called with isDeleted: false. Simulate a
            // soft-deleted user by returning null (the filter excluded them).
            mockFindOne.mockReturnValue(selectChain(null));

            await expect(UserService.loginUser('ghost@example.com', 'secret123')).rejects.toMatchObject({
                statusCode: HttpStatusCode.UNAUTHORIZED,
            });

            expect(mockFindOne).toHaveBeenCalledWith({
                email: 'ghost@example.com',
                isDeleted: false,
            });
            expect(TokenService.generateTokens).not.toHaveBeenCalled();
        });

        it('returns Invalid credentials (not 404) to avoid account enumeration', async () => {
            mockFindOne.mockReturnValue(selectChain(null));

            await expect(UserService.loginUser('ghost@example.com', 'secret123')).rejects.toMatchObject({
                statusCode: HttpStatusCode.UNAUTHORIZED,
            });
        });

        it('issues tokens only when findOne returns an active user', async () => {
            const fakeUser = {
                _id: { toString: () => 'user-1' },
                email: 'alice@example.com',
                role: 'user',
                username: 'alice',
                photo: null,
                matchPassword: vi.fn().mockResolvedValue(true),
            };
            mockFindOne.mockReturnValue(selectChain(fakeUser));

            const result = await UserService.loginUser('alice@example.com', 'secret123');

            expect(result.token).toBe('at');
            expect(TokenService.generateTokens).toHaveBeenCalledWith('user-1', 'alice@example.com', 'user');
        });
    });

    // -----------------------------------------------------------------------
    // forgotPassword — BE-03 follow-up
    // -----------------------------------------------------------------------
    describe('forgotPassword (soft-delete regression)', () => {
        function selectChain(resolvedValue: unknown) {
            return {
                select: vi.fn().mockReturnValue({
                    exec: vi.fn().mockResolvedValue(resolvedValue),
                }),
            };
        }

        it('does not send a reset email when the user is soft-deleted', async () => {
            mockFindOne.mockReturnValue(selectChain(null));
            const nodemailer = (await import('nodemailer')).default as unknown as {
                createTransport: ReturnType<typeof vi.fn>;
            };
            const sendMail = vi.fn().mockResolvedValue(undefined);
            nodemailer.createTransport.mockReturnValue({ sendMail });

            const result = await UserService.forgotPassword('ghost@example.com');

            expect(mockFindOne).toHaveBeenCalledWith({
                email: 'ghost@example.com',
                isDeleted: false,
            });
            expect(sendMail).not.toHaveBeenCalled();
            // Always returns the safe generic response (OWASP A07).
            expect(result).toEqual({
                message: 'If that email exists, reset instructions have been sent',
            });
        });
    });

    // -----------------------------------------------------------------------
    // resetPassword — BE-03 follow-up
    // -----------------------------------------------------------------------
    describe('resetPassword (soft-delete regression)', () => {
        const originalSecret = process.env.JWT_RESET_SECRET;

        beforeEach(() => {
            process.env.JWT_RESET_SECRET = 'test-reset-secret';
        });

        afterAll(() => {
            process.env.JWT_RESET_SECRET = originalSecret;
        });

        it('rejects a valid reset token if the target user has been soft-deleted', async () => {
            (jwt.verify as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
                userId: 'deleted-user',
                purpose: 'password-reset',
            });

            // getUserByResetToken uses findOne({_id, isDeleted:false}).select(...).exec()
            mockFindOne.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    exec: vi.fn().mockResolvedValue(null),
                }),
            });

            await expect(UserService.resetPassword('valid.jwt.token', 'newPass123!')).rejects.toMatchObject({
                statusCode: HttpStatusCode.NOT_FOUND,
            });

            expect(mockFindOne).toHaveBeenCalledWith({
                _id: 'deleted-user',
                isDeleted: false,
            });
        });
    });

    // -----------------------------------------------------------------------
    // deleteUserById — BE-03 follow-up: must revoke active tokens
    // -----------------------------------------------------------------------
    describe('deleteUserById token revocation (BE-03 follow-up)', () => {
        it('revokes all user tokens after a successful soft delete', async () => {
            const fakeUser = { _id: 'user-revoke', isDeleted: true, isActive: false };
            mockFindOneAndUpdate.mockReturnValue(chainableMock(fakeUser));

            await UserService.deleteUserById('user-revoke');

            expect(TokenService.revokeAllUserTokens).toHaveBeenCalledWith('user-revoke');
        });

        it('does not call revokeAllUserTokens when the soft delete fails (user not found)', async () => {
            mockFindOneAndUpdate.mockReturnValue(chainableMock(null));

            await expect(UserService.deleteUserById('nonexistent')).rejects.toMatchObject({
                statusCode: HttpStatusCode.NOT_FOUND,
            });
            expect(TokenService.revokeAllUserTokens).not.toHaveBeenCalled();
        });

        it('still returns success when token revocation fails (logs the error)', async () => {
            const fakeUser = { _id: 'user-revoke-fail', isDeleted: true };
            mockFindOneAndUpdate.mockReturnValue(chainableMock(fakeUser));
            (TokenService.revokeAllUserTokens as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
                new Error('redis down')
            );

            const result = await UserService.deleteUserById('user-revoke-fail');

            expect(result).toEqual({ message: 'User deleted successfully' });
            expect(TokenService.revokeAllUserTokens).toHaveBeenCalledWith('user-revoke-fail');
        });
    });
});
