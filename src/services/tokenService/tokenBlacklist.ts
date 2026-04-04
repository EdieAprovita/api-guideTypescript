import type { Redis } from 'ioredis';
import * as jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import type { TokenInfo, PipelineClient } from './tokenTypes.js';
import { REDIS_KEY_PATTERNS, TOKEN_TTL } from './tokenTypes.js';
import logger from '../../utils/logger.js';

type ExecuteRedis = <T>(name: string, op: () => Promise<T>) => Promise<T>;

/**
 * Revokes a single per-device refresh token by its exact Redis key.
 * Exported from this module (not from any barrel) so TokenService can
 * inject it into refreshTokensImpl via dependency injection (H-17).
 */
export async function revokeRefreshTokenByKey(key: string, executeRedis: ExecuteRedis, redis: Redis): Promise<void> {
    await executeRedis('revoke single refresh token', () => redis.del(key));
}

export async function blacklistToken(token: string, executeRedis: ExecuteRedis, redis: Redis): Promise<void> {
    let blacklistKey: string;
    let ttl: number = TOKEN_TTL.blacklistDefaultSeconds;

    try {
        const decoded = jwt.decode(token) as { exp?: number; jti?: string } | null;
        if (decoded?.jti) {
            blacklistKey = REDIS_KEY_PATTERNS.blacklistJti(decoded.jti);
        } else {
            const tokenHash = createHash('sha256').update(token).digest('hex');
            blacklistKey = REDIS_KEY_PATTERNS.blacklistHash(tokenHash);
            logger.warn('blacklistToken: token missing jti — using SHA-256 hash as fallback key');
        }
        if (decoded?.exp) {
            const expirationTime = decoded.exp - Math.floor(Date.now() / 1000);
            ttl = Math.max(expirationTime, TOKEN_TTL.blacklistDefaultSeconds);
        }
    } catch {
        // jwt.decode failed (malformed token) — fall back to SHA-256 hash
        const tokenHash = createHash('sha256').update(token).digest('hex');
        blacklistKey = REDIS_KEY_PATTERNS.blacklistHash(tokenHash);
    }

    // Fail-closed: if Redis is unavailable this will throw. The logout controller
    // handles this with a best-effort catch so the client session still ends.
    await executeRedis('blacklist token', () => redis.setex(blacklistKey, ttl, 'revoked'));
}

export async function isTokenBlacklisted(token: string, executeRedis: ExecuteRedis, redis: Redis): Promise<boolean> {
    try {
        const decoded = jwt.decode(token) as { jti?: string } | null;
        if (decoded?.jti) {
            const result = await executeRedis('get blacklist jti', () =>
                redis.get(REDIS_KEY_PATTERNS.blacklistJti(decoded.jti!))
            );
            return result !== null;
        }
    } catch {
        // jwt.decode failed — fall through to hash check
    }
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const result = await executeRedis('get blacklist hash', () =>
        redis.get(REDIS_KEY_PATTERNS.blacklistHash(tokenHash))
    );
    return result !== null;
}

/**
 * Revokes all per-device refresh tokens for a user by scanning
 * the refresh_token:{userId}:* key space and deleting every match.
 * Used by revokeAllUserTokens and as a fallback in refreshTokens
 * when jti is unavailable (H-17).
 */
export async function revokeRefreshToken(userId: string, executeRedis: ExecuteRedis, redis: Redis): Promise<void> {
    let cursor = '0';
    do {
        const [nextCursor, keys] = await executeRedis('scan refresh tokens for user', () =>
            redis.scan(cursor, 'MATCH', REDIS_KEY_PATTERNS.refreshTokenScan(userId), 'COUNT', 100)
        );
        cursor = nextCursor;
        if (keys.length > 0) {
            // Pipeline all DELs per SCAN batch to avoid N+1 round-trips
            const delPipeline = (redis as Redis & { pipeline: () => PipelineClient }).pipeline();
            for (const key of keys) {
                delPipeline.del(key);
            }
            await executeRedis('pipeline DEL revoked tokens', () => delPipeline.exec());
        }
    } while (cursor !== '0');
}

export async function revokeAllUserTokens(
    userId: string,
    executeRedis: ExecuteRedis,
    redis: Redis,
    revokeRefreshFn?: (userId: string) => Promise<void>
): Promise<void> {
    // Allow callers (e.g. TokenService) to inject their own revokeRefreshToken
    // so that test spies on the delegator method are correctly intercepted.
    const revokeFn = revokeRefreshFn ?? ((uid: string) => revokeRefreshToken(uid, executeRedis, redis));
    await revokeFn(userId);

    // Mark all access tokens for this user as revoked
    const userTokenKey = REDIS_KEY_PATTERNS.userTokens(userId);
    await executeRedis('revoke all user tokens', () =>
        redis.setex(userTokenKey, TOKEN_TTL.userTokensSeconds, 'revoked')
    );
}

export async function isUserTokensRevoked(userId: string, executeRedis: ExecuteRedis, redis: Redis): Promise<boolean> {
    const userTokenKey = REDIS_KEY_PATTERNS.userTokens(userId);
    const result = await executeRedis('get user token revocation', () => redis.get(userTokenKey));
    return result === 'revoked';
}

export function getTokenInfo(token: string): TokenInfo {
    try {
        const decoded = jwt.decode(token, { complete: true });

        if (!decoded || typeof decoded !== 'object' || !('header' in decoded) || !('payload' in decoded)) {
            return { isValid: false, error: 'Invalid token format' };
        }

        const { header, payload } = decoded;

        if (typeof payload !== 'object' || payload === null) {
            return { isValid: false, error: 'Invalid payload format' };
        }

        return {
            header,
            payload: payload as jwt.JwtPayload,
            isValid: true,
        };
    } catch (error) {
        return {
            isValid: false,
            error: error instanceof Error ? error.message : 'Invalid token format',
        };
    }
}

/**
 * Removes blacklist entries that have no TTL set (should not normally happen,
 * but provides a safety net for manual admin operations that bypass setex).
 *
 * H-11: Eliminates the N+1 Redis call pattern by pipelining all TTL checks
 * per SCAN batch, then pipelining the DEL operations for keys without a TTL.
 * Returns the number of keys deleted.
 */
export async function cleanup(executeRedis: ExecuteRedis, redis: Redis): Promise<number> {
    let cursor = '0';
    let deletedCount = 0;

    do {
        const [nextCursor, keys] = await executeRedis('scan blacklist keys', () =>
            redis.scan(cursor, 'MATCH', REDIS_KEY_PATTERNS.blacklistAll, 'COUNT', 100)
        );
        cursor = nextCursor;

        if (keys.length > 0) {
            // Pipeline all TTL checks for this batch in a single round-trip
            const ttlPipeline = (redis as Redis & { pipeline: () => PipelineClient }).pipeline();
            for (const key of keys) {
                ttlPipeline.ttl(key);
            }
            const ttlResults = await executeRedis('pipeline TTL batch', () => ttlPipeline.exec());

            // Collect keys with no TTL set (TTL === -1 means key exists but no expiry)
            const noTtlKeys = keys.filter((_key, i) => {
                const ttl = ttlResults?.[i]?.[1] as number | undefined;
                return ttl === -1;
            });

            // Pipeline DEL operations for all expired/no-TTL keys
            if (noTtlKeys.length > 0) {
                const delPipeline = (redis as Redis & { pipeline: () => PipelineClient }).pipeline();
                for (const key of noTtlKeys) {
                    delPipeline.del(key);
                }
                await executeRedis('pipeline DEL batch', () => delPipeline.exec());
                deletedCount += noTtlKeys.length;
            }
        }
    } while (cursor !== '0');

    return deletedCount;
}
