import type { Redis as RedisType } from 'ioredis';
import type { TokenPayload, RefreshTokenPayload, TokenPair } from './tokenTypes.js';
import { JWT_CONFIG, REDIS_KEY_PATTERNS } from './tokenTypes.js';
import logger from '../../utils/logger.js';
import { TokenRevokedError, HttpError, HttpStatusCode } from '../../types/Errors.js';
import * as jwt from 'jsonwebtoken';

/** Performs raw JWT verification plus blacklist check; returns the decoded payload. */
type VerifyFn = (token: string, secret: string) => Promise<TokenPayload>;

/** Signature of TokenService.generateTokenPair. */
type GenerateFn = (payload: TokenPayload) => Promise<TokenPair>;

/**
 * Revokes a single per-device refresh token by its exact Redis key.
 * Will be satisfied by revokeRefreshTokenByKey from tokenBlacklist.ts (PR-T3).
 */
type RevokeByKeyFn = (key: string) => Promise<void>;

/** Scan-based full revocation for a user (fallback when jti is absent, H-17). */
type RevokeAllForUserFn = (userId: string) => Promise<void>;

/**
 * Builds the core verifyToken helper used by both verifyAccessTokenImpl and
 * verifyRefreshTokenImpl. Receives the blacklist-check and executeRedis
 * dependencies via closure to avoid class coupling.
 */
export function buildVerifyToken(isTokenBlacklisted: (token: string) => Promise<boolean>): VerifyFn {
    return async function verifyToken(token: string, secret: string): Promise<TokenPayload> {
        try {
            const decoded = jwt.verify(token, secret, {
                issuer: JWT_CONFIG.issuer,
                audience: JWT_CONFIG.audience,
                algorithms: [JWT_CONFIG.algorithm],
            }) as TokenPayload;

            // Fail-closed blacklist check: reject token if Redis is unavailable
            try {
                const isBlacklisted = await isTokenBlacklisted(token);
                if (isBlacklisted) {
                    throw new TokenRevokedError();
                }
            } catch (redisError) {
                // Re-throw intentional revocations (not Redis infrastructure failures)
                if (redisError instanceof TokenRevokedError) {
                    throw redisError;
                }
                // Fail-closed: if Redis is unavailable, reject the token for safety.
                logger.error('Redis blacklist check unavailable — rejecting token for safety', redisError as Error);
                throw new HttpError(
                    HttpStatusCode.SERVICE_UNAVAILABLE,
                    'Token verification unavailable — please try again later'
                );
            }

            return decoded;
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new Error('Token has expired');
            } else if (error instanceof jwt.NotBeforeError) {
                throw new Error('Token not active yet');
            } else if (error instanceof jwt.JsonWebTokenError) {
                throw new Error(`JWT verification failed: ${error.message}`);
            } else {
                throw error;
            }
        }
    };
}

/**
 * Verifies an access token, wrapping errors with a consistent message.
 * Delegates JWT verification and blacklist checking to the injected verifyFn.
 */
export async function verifyAccessTokenImpl(token: string, verifyFn: VerifyFn, secret: string): Promise<TokenPayload> {
    try {
        return await verifyFn(token, secret);
    } catch (error: unknown) {
        // Preserve intentional typed errors — TokenRevokedError (401) and
        // HttpError (e.g. 503 from fail-closed Redis path in buildVerifyToken)
        if (error instanceof TokenRevokedError || error instanceof HttpError) {
            throw error;
        }
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Invalid or expired access token: ${message}`);
    }
}

/**
 * Verifies a refresh token, enforcing type claim and confirming the exact
 * per-device Redis entry still exists (H-17).
 */
export async function verifyRefreshTokenImpl(
    token: string,
    verifyFn: VerifyFn,
    secret: string,
    executeRedis: <T>(name: string, op: () => Promise<T>) => Promise<T>,
    redis: RedisType
): Promise<RefreshTokenPayload> {
    try {
        const payload = (await verifyFn(token, secret)) as RefreshTokenPayload;

        if (payload.type !== 'refresh') {
            throw new Error('Invalid token type');
        }

        // H-17: verify the exact per-device session key exists in Redis.
        const jti = (payload as { jti?: string }).jti;
        if (!jti) {
            throw new Error('Refresh token missing jti');
        }
        const refreshTokenKey = REDIS_KEY_PATTERNS.refreshToken(payload.userId, jti);
        const storedToken = await executeRedis('load refresh token', () => redis.get(refreshTokenKey));

        if (!storedToken || storedToken !== token) {
            throw new Error('Refresh token not found or invalid');
        }

        return payload;
    } catch (error) {
        // Preserve intentional typed errors — HttpError (503 fail-closed Redis) and
        // TokenRevokedError (401) must not be collapsed into a generic Error
        if (error instanceof HttpError || error instanceof TokenRevokedError) {
            throw error;
        }
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Invalid or expired refresh token: ${message}`);
    }
}

/**
 * Rotates a refresh token: verifies the old one, revokes it (per-device key
 * or full-user scan fallback), then generates and returns a new token pair.
 *
 * Dependency injection avoids coupling to blacklist or generation modules.
 * PR-T3 will supply revokeByKeyFn from tokenBlacklist.ts.
 *
 * @param verifyRefreshFn - Pre-bound verifyRefreshToken (handles JWT + Redis lookup)
 * @param generateFn      - Pre-bound generateTokenPair
 * @param blacklistFn     - Pre-bound blacklistToken
 * @param revokeByKeyFn   - Revoke a single per-device key (jti path, H-17)
 * @param revokeAllForUserFn - Scan-revoke all sessions (fallback when jti absent)
 */
export async function refreshTokensImpl(
    refreshToken: string,
    verifyRefreshFn: (token: string) => Promise<RefreshTokenPayload>,
    generateFn: GenerateFn,
    blacklistFn: (token: string) => Promise<void>,
    revokeByKeyFn: RevokeByKeyFn,
    revokeAllForUserFn: RevokeAllForUserFn
): Promise<TokenPair> {
    const payload = await verifyRefreshFn(refreshToken);

    // Blacklist old refresh token and revoke the per-device entry (H-17).
    const jti = (payload as { jti?: string }).jti;
    await Promise.all([
        blacklistFn(refreshToken),
        jti
            ? revokeByKeyFn(REDIS_KEY_PATTERNS.refreshToken(payload.userId, jti))
            : // Fallback: jti absent → scan-revoke all sessions for this user
              revokeAllForUserFn(payload.userId),
    ]);

    return generateFn({
        userId: payload.userId,
        email: payload.email,
        ...(payload.role !== undefined && { role: payload.role }),
    });
}
