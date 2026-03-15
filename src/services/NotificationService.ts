import webpush, { WebPushError } from 'web-push';
import { User } from '../models/User.js';
import logger from '../utils/logger.js';

// VAPID keys loaded at module init — missing keys emit a warn log and skip push.
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushPayload {
    title: string;
    body: string;
    icon?: string;
    url?: string;
    data?: Record<string, unknown>;
}

export type NotificationEvent = 'newRestaurant' | 'newRecipe' | 'communityUpdate' | 'healthTip' | 'promotion';

// Maps each event type to the corresponding notificationSettings field.
const EVENT_SETTING_MAP: Record<
    NotificationEvent,
    'newRestaurants' | 'newRecipes' | 'communityUpdates' | 'healthTips' | 'promotions'
> = {
    newRestaurant: 'newRestaurants',
    newRecipe: 'newRecipes',
    communityUpdate: 'communityUpdates',
    healthTip: 'healthTips',
    promotion: 'promotions',
};

class NotificationService {
    /**
     * Returns true when all three VAPID env vars are set.
     * Callers can check this before attempting to send.
     */
    isConfigured(): boolean {
        return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT);
    }

    /**
     * Sends a push notification to a single user.
     *
     * Logs and returns early if:
     * - VAPID is not configured (warn)
     * - User not found in DB (warn)
     * - User has no pushSubscription stored (debug)
     * - User has notifications globally disabled (debug)
     * - User has the specific event type disabled (debug)
     *
     * Auto-deletes stale subscriptions on HTTP 410 Gone.
     * Throws for non-410 delivery failures so broadcast() can count them.
     */
    async sendToUser(userId: string, payload: PushPayload, event: NotificationEvent): Promise<void> {
        if (!this.isConfigured()) {
            logger.warn('NotificationService: VAPID not configured — push skipped', { userId, event });
            return;
        }

        const user = await User.findById(userId).select('pushSubscription notificationSettings');

        if (!user) {
            logger.warn('NotificationService: user not found', { userId });
            return;
        }

        if (!user.pushSubscription) {
            logger.debug('NotificationService: user has no push subscription', { userId });
            return;
        }

        // Global kill-switch: treat missing settings (undefined) as enabled by default.
        const settings = user.notificationSettings;
        if (settings?.enabled === false) {
            logger.debug('NotificationService: notifications disabled for user', { userId });
            return;
        }

        // Per-event toggle: only block if explicitly false.
        const settingKey = EVENT_SETTING_MAP[event];
        if (settings?.[settingKey] === false) {
            logger.debug('NotificationService: event type disabled for user', { userId, event });
            return;
        }

        const subscription = {
            endpoint: user.pushSubscription.endpoint,
            keys: {
                p256dh: user.pushSubscription.keys.p256dh,
                auth: user.pushSubscription.keys.auth,
            },
        };

        try {
            await webpush.sendNotification(subscription, JSON.stringify(payload));
            logger.info('NotificationService: push notification sent', { userId, event });
        } catch (err) {
            if (err instanceof WebPushError && err.statusCode === 410) {
                // Subscription expired or revoked — best-effort cleanup to avoid future attempts.
                try {
                    await User.updateOne({ _id: userId }, { $unset: { pushSubscription: 1 } });
                    logger.info('NotificationService: stale subscription removed (410 Gone)', { userId });
                } catch (dbErr) {
                    logger.error('NotificationService: failed to clean stale subscription', {
                        userId,
                        error: dbErr instanceof Error ? dbErr.message : String(dbErr),
                    });
                }
                return;
            }

            logger.error('NotificationService: failed to send push notification', {
                userId,
                event,
                error: err instanceof Error ? err.message : String(err),
            });
            throw err;
        }
    }

    /**
     * Sends a push notification to multiple users concurrently.
     * Uses allSettled so a single failure never blocks the rest.
     */
    async broadcast(userIds: string[], payload: PushPayload, event: NotificationEvent): Promise<void> {
        const results = await Promise.allSettled(userIds.map(userId => this.sendToUser(userId, payload, event)));

        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed > 0) {
            logger.warn('NotificationService: broadcast had failures', {
                total: userIds.length,
                failed,
                event,
            });
        }
    }
}

export default new NotificationService();
