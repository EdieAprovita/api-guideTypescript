import type { CookieOptions } from 'express';

/**
 * Shared cookie options for the refresh token.
 * `secure` is derived from NODE_ENV at call time so that unit tests
 * (NODE_ENV=test) and local dev (NODE_ENV=development) do not require HTTPS,
 * while production always enforces it.
 */
export function getRefreshTokenCookieOptions(): CookieOptions {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
}
