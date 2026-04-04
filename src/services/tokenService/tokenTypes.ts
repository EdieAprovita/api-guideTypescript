import type * as jwt from 'jsonwebtoken';

export interface TokenPayload {
    userId: string;
    email: string;
    role?: string;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export interface RefreshTokenPayload extends TokenPayload {
    type: 'refresh';
}

export interface TokenInfo {
    header?: jwt.JwtHeader;
    payload?: jwt.JwtPayload;
    isValid: boolean;
    error?: string;
}

// Minimal pipeline interface used by cleanup() (H-11)
export interface PipelineClient {
    ttl(key: string): this;
    del(key: string): this;
    exec(): Promise<Array<[Error | null, unknown]>>;
}

// Mock Redis for testing
export interface MockRedisEntry {
    value: string;
    expiry: number;
}

/** Single source of truth for JWT issuer, audience, and algorithm. */
export const JWT_CONFIG = {
    issuer: 'vegan-guide-api',
    audience: 'vegan-guide-client',
    algorithm: 'HS256' as const,
} as const;

/** Factory functions for all Redis key patterns used by TokenService. */
export const REDIS_KEY_PATTERNS = {
    refreshToken: (userId: string, jti: string) => `refresh_token:${userId}:${jti}`,
    refreshTokenScan: (userId: string) => `refresh_token:${userId}:*`,
    blacklistJti: (jti: string) => `blacklist:${jti}`,
    blacklistHash: (hash: string) => `blacklist:hash:${hash}`,
    userTokens: (userId: string) => `user_tokens:${userId}`,
    blacklistAll: 'blacklist:*',
} as const;

/** TTL constants (in seconds) used throughout TokenService. */
export const TOKEN_TTL = {
    refreshTokenSeconds: 7 * 24 * 60 * 60, // 7 days
    blacklistDefaultSeconds: 3600, // 1 hour
    userTokensSeconds: 24 * 60 * 60, // 24 hours
} as const;
