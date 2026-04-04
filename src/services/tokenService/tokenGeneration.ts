import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import type { TokenPayload } from './tokenTypes.js';
import { JWT_CONFIG } from './tokenTypes.js';
import logger from '../../utils/logger.js';

export interface TokenSignConfig {
    issuer: string;
    audience: string;
    algorithm: 'HS256';
}

export function createTokenPayload(payload: TokenPayload): TokenPayload & { iat: number; jti: string } {
    return {
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        jti: randomUUID(),
    };
}

export function signToken(
    payload: object,
    secret: string,
    expiresIn: string,
    config: TokenSignConfig = JWT_CONFIG
): string {
    if (process.env.DEBUG_TOKENS || process.env.DEBUG_TESTS) {
        logger.debug('TokenService.signToken called', {
            payloadKeys: Object.keys(payload),
            secretLength: secret.length,
            expiresIn,
            issuer: config.issuer,
            audience: config.audience,
        });
    }

    try {
        const result = jwt.sign(payload, secret, {
            expiresIn,
            issuer: config.issuer,
            audience: config.audience,
            algorithm: config.algorithm,
        } as jwt.SignOptions);

        if (process.env.DEBUG_TOKENS || process.env.DEBUG_TESTS) {
            logger.debug('TokenService.signToken result', { generated: Boolean(result) });
        }
        return result;
    } catch (error) {
        if (process.env.DEBUG_TOKENS || process.env.DEBUG_TESTS) {
            logger.error('TokenService.signToken error', error as Error);
        }
        throw error;
    }
}

export function debugLog(message: string, ...params: unknown[]): void {
    if (process.env.DEBUG_TOKENS || process.env.DEBUG_TESTS) {
        logger.debug(`TokenService debug: ${message}`, { optionalParams: params });
    }
}

export function debugError(message: string, ...params: unknown[]): void {
    if (process.env.DEBUG_TOKENS || process.env.DEBUG_TESTS) {
        logger.error(`TokenService debug error: ${message}`, { optionalParams: params });
    }
}
