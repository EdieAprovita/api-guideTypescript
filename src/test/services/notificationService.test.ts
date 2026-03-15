import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('web-push', () => {
    const WebPushError = class extends Error {
        statusCode: number;
        constructor(message: string, statusCode: number) {
            super(message);
            this.name = 'WebPushError';
            this.statusCode = statusCode;
        }
    };
    return {
        default: {
            setVapidDetails: vi.fn(),
            sendNotification: vi.fn(),
        },
        WebPushError,
    };
});

vi.mock('../../models/User.js', () => ({
    User: {
        findById: vi.fn(),
        updateOne: vi.fn(),
    },
}));

vi.mock('../../utils/logger.js', () => ({
    default: {
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
    },
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import webpush, { WebPushError } from 'web-push';
import { User } from '../../models/User.js';
import logger from '../../utils/logger.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const VAPID_ENV = {
    VAPID_PUBLIC_KEY: 'BPublicKey',
    VAPID_PRIVATE_KEY: 'privateKey',
    VAPID_SUBJECT: 'mailto:test@test.com',
};

const makeUser = (overrides: Record<string, unknown> = {}) => ({
    pushSubscription: {
        endpoint: 'https://push.example.com/sub/1',
        keys: { p256dh: 'p256dhKey', auth: 'authKey' },
    },
    notificationSettings: {
        enabled: true,
        newRestaurants: true,
        newRecipes: true,
        communityUpdates: true,
        healthTips: true,
        promotions: true,
    },
    ...overrides,
});

const PAYLOAD = { title: 'Test', body: 'Hello' };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('NotificationService', () => {
    let service: (typeof import('../../services/NotificationService.js'))['default'];
    let mockFindById: ReturnType<typeof vi.fn>;
    let mockSendNotification: ReturnType<typeof vi.fn>;
    let mockUpdateOne: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.resetModules();
        // Set VAPID env vars before importing the module so isConfigured() returns true.
        Object.assign(process.env, VAPID_ENV);

        // Re-import after resetting modules so module-level VAPID constants are re-evaluated.
        service = (await import('../../services/NotificationService.js')).default;

        mockFindById = vi.mocked(User.findById);
        // webpush default export is { setVapidDetails, sendNotification } per the mock factory.
        mockSendNotification = vi.mocked(webpush).sendNotification as ReturnType<typeof vi.fn>;
        mockUpdateOne = vi.mocked(User.updateOne);
    });

    afterEach(() => {
        vi.clearAllMocks();
        delete process.env.VAPID_PUBLIC_KEY;
        delete process.env.VAPID_PRIVATE_KEY;
        delete process.env.VAPID_SUBJECT;
    });

    // ── isConfigured ──────────────────────────────────────────────────────────

    describe('isConfigured()', () => {
        it('returns true when all VAPID env vars are set', () => {
            expect(service.isConfigured()).toBe(true);
        });

        it('returns false when VAPID env vars are missing', async () => {
            vi.resetModules();
            delete process.env.VAPID_PUBLIC_KEY;
            const freshService = (await import('../../services/NotificationService.js')).default;
            expect(freshService.isConfigured()).toBe(false);
        });
    });

    // ── sendToUser ────────────────────────────────────────────────────────────

    describe('sendToUser()', () => {
        it('sends notification on happy path', async () => {
            mockFindById.mockReturnValue({ select: vi.fn().mockResolvedValue(makeUser()) });
            mockSendNotification.mockResolvedValue(undefined);

            await service.sendToUser('user123', PAYLOAD, 'newRestaurant');

            expect(mockSendNotification).toHaveBeenCalledOnce();
            expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
                'NotificationService: push notification sent',
                expect.objectContaining({ userId: 'user123', event: 'newRestaurant' })
            );
        });

        it('skips when VAPID is not configured', async () => {
            vi.resetModules();
            delete process.env.VAPID_PUBLIC_KEY;
            const freshService = (await import('../../services/NotificationService.js')).default;

            await freshService.sendToUser('user123', PAYLOAD, 'newRestaurant');

            expect(mockSendNotification).not.toHaveBeenCalled();
            expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
                'NotificationService: VAPID not configured — push skipped',
                expect.any(Object)
            );
        });

        it('skips when user is not found in DB', async () => {
            mockFindById.mockReturnValue({ select: vi.fn().mockResolvedValue(null) });

            await service.sendToUser('nonexistent', PAYLOAD, 'newRestaurant');

            expect(mockSendNotification).not.toHaveBeenCalled();
            expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
                'NotificationService: user not found',
                expect.any(Object)
            );
        });

        it('skips when user has no pushSubscription', async () => {
            mockFindById.mockReturnValue({
                select: vi.fn().mockResolvedValue(makeUser({ pushSubscription: undefined })),
            });

            await service.sendToUser('user123', PAYLOAD, 'newRestaurant');

            expect(mockSendNotification).not.toHaveBeenCalled();
            expect(vi.mocked(logger.debug)).toHaveBeenCalledWith(
                'NotificationService: user has no push subscription',
                expect.any(Object)
            );
        });

        it('skips when notifications are globally disabled', async () => {
            const user = makeUser({
                notificationSettings: { ...makeUser().notificationSettings, enabled: false },
            });
            mockFindById.mockReturnValue({ select: vi.fn().mockResolvedValue(user) });

            await service.sendToUser('user123', PAYLOAD, 'newRestaurant');

            expect(mockSendNotification).not.toHaveBeenCalled();
            expect(vi.mocked(logger.debug)).toHaveBeenCalledWith(
                'NotificationService: notifications disabled for user',
                expect.any(Object)
            );
        });

        it('skips when specific event type is disabled (validates EVENT_SETTING_MAP)', async () => {
            // All settings explicitly true except healthTips — validates the correct key is checked.
            const user = makeUser({
                notificationSettings: {
                    enabled: true,
                    newRestaurants: true,
                    newRecipes: true,
                    communityUpdates: true,
                    healthTips: false, // the one under test
                    promotions: true, // explicitly true to catch wrong key mapping
                },
            });
            mockFindById.mockReturnValue({ select: vi.fn().mockResolvedValue(user) });

            await service.sendToUser('user123', PAYLOAD, 'healthTip');

            expect(mockSendNotification).not.toHaveBeenCalled();
            expect(vi.mocked(logger.debug)).toHaveBeenCalledWith(
                'NotificationService: event type disabled for user',
                expect.any(Object)
            );
        });

        it('auto-deletes subscription on 410 Gone', async () => {
            mockFindById.mockReturnValue({ select: vi.fn().mockResolvedValue(makeUser()) });
            const staleError = new WebPushError('Gone', 410);
            mockSendNotification.mockRejectedValue(staleError);
            mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });

            await service.sendToUser('user123', PAYLOAD, 'newRestaurant');

            expect(mockSendNotification).toHaveBeenCalledOnce();
            expect(mockUpdateOne).toHaveBeenCalledWith({ _id: 'user123' }, { $unset: { pushSubscription: 1 } });
            expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
                'NotificationService: stale subscription removed (410 Gone)',
                expect.any(Object)
            );
        });

        it('logs error and rethrows on non-410 webpush failure (enables broadcast to count it)', async () => {
            mockFindById.mockReturnValue({ select: vi.fn().mockResolvedValue(makeUser()) });
            mockSendNotification.mockRejectedValue(new Error('Network error'));

            await expect(service.sendToUser('user123', PAYLOAD, 'newRecipe')).rejects.toThrow('Network error');

            expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
                'NotificationService: failed to send push notification',
                expect.objectContaining({ userId: 'user123', error: 'Network error' })
            );
        });

        it('sends when notificationSettings is undefined (default-enabled behavior)', async () => {
            const user = makeUser({ notificationSettings: undefined });
            mockFindById.mockReturnValue({ select: vi.fn().mockResolvedValue(user) });
            mockSendNotification.mockResolvedValue(undefined);

            await service.sendToUser('user123', PAYLOAD, 'newRestaurant');

            expect(mockSendNotification).toHaveBeenCalledOnce();
        });
    });

    // ── broadcast ─────────────────────────────────────────────────────────────

    describe('broadcast()', () => {
        it('calls sendToUser for each userId with allSettled', async () => {
            const sendSpy = vi.spyOn(service, 'sendToUser').mockResolvedValue(undefined);

            await service.broadcast(['u1', 'u2', 'u3'], PAYLOAD, 'newRestaurant');

            expect(sendSpy).toHaveBeenCalledTimes(3);
            expect(sendSpy).toHaveBeenCalledWith('u1', PAYLOAD, 'newRestaurant');
            expect(sendSpy).toHaveBeenCalledWith('u2', PAYLOAD, 'newRestaurant');
            expect(sendSpy).toHaveBeenCalledWith('u3', PAYLOAD, 'newRestaurant');
        });

        it('completes even when some sendToUser calls fail', async () => {
            const sendSpy = vi
                .spyOn(service, 'sendToUser')
                .mockResolvedValueOnce(undefined)
                .mockRejectedValueOnce(new Error('Unexpected'))
                .mockResolvedValueOnce(undefined);

            await expect(service.broadcast(['u1', 'u2', 'u3'], PAYLOAD, 'newRecipe')).resolves.toBeUndefined();

            expect(sendSpy).toHaveBeenCalledTimes(3);
            expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
                'NotificationService: broadcast had failures',
                expect.objectContaining({ failed: 1, total: 3 })
            );
        });

        it('resolves immediately with no warnings for an empty userIds array', async () => {
            await expect(service.broadcast([], PAYLOAD, 'newRestaurant')).resolves.toBeUndefined();
            expect(vi.mocked(logger.warn)).not.toHaveBeenCalled();
        });
    });
});
