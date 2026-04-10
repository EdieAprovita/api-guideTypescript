import { describe, it, expect, beforeEach, vi } from 'vitest';
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
});
