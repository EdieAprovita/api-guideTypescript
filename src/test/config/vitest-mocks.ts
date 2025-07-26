import { vi } from 'vitest';
import { faker } from '@faker-js/faker';

// ============================================================================
// MOCK FACTORIES
// ============================================================================

export const createMockJWT = () => {
    const generateValidObjectId = () => faker.database.mongodbObjectId();

    const mockSign = vi.fn().mockImplementation(payload => {
        const actualUserId = payload?.userId || generateValidObjectId();
        const actualEmail = payload?.email || 'test@email.com';
        const actualRole = payload?.role || 'user';
        const type = payload?.type || 'access';

        // Create realistic JWT structure
        const header = { alg: 'HS256', typ: 'JWT' };
        const payloadData = {
            userId: actualUserId,
            email: actualEmail,
            role: actualRole,
            type,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
            jti: Math.random().toString(36).substring(2, 11),
        };

        const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64').replace(/=/g, '');
        const payloadB64 = Buffer.from(JSON.stringify(payloadData)).toString('base64').replace(/=/g, '');
        const signature = 'mock-signature-' + Math.random().toString(36).substring(2, 11);

        return `${headerB64}.${payloadB64}.${signature}`;
    });

    const mockVerify = vi.fn().mockImplementation(token => {
        const tokenStr = token as string;
        try {
            if (tokenStr.includes('.')) {
                const parts = tokenStr.split('.');
                if (parts.length === 3) {
                    const payloadPart = parts[1];
                    return JSON.parse(Buffer.from(payloadPart, 'base64').toString());
                }
            }
        } catch (e) {
            // Fallback for invalid tokens
        }

        return {
            userId: generateValidObjectId(),
            email: 'test@email.com',
            role: 'user',
            type: 'access',
            exp: Math.floor(Date.now() / 1000) + 3600,
        };
    });

    const mockDecode = vi.fn().mockImplementation(token => mockVerify(token));

    return {
        __esModule: true,
        default: { sign: mockSign, verify: mockVerify, decode: mockDecode },
        sign: mockSign,
        verify: mockVerify,
        decode: mockDecode,
    };
};

export const createMockTokenService = () => {
    const jwt = createMockJWT();
    const blacklistedTokens = new Set<string>();
    const usedRefreshTokens = new Set<string>();
    const revokedUserTokens = new Set<string>();

    return {
        generateTokenPair: vi.fn().mockImplementation(async payload => {
            const tokenPayload = {
                ...payload,
                iat: Math.floor(Date.now() / 1000),
                nonce: Math.random().toString(36).substring(7),
            };
            const accessToken = jwt.sign(tokenPayload);
            const refreshToken = jwt.sign({ ...tokenPayload, type: 'refresh' });
            return { accessToken, refreshToken };
        }),

        generateTokens: vi.fn().mockImplementation(async (userId, email, role) => {
            const payload = { userId, email: email || 'test@example.com', role: role || 'user' };
            const tokenService = createMockTokenService();
            return tokenService.generateTokenPair(payload);
        }),

        verifyAccessToken: vi.fn().mockImplementation(async token => {
            if (!token || blacklistedTokens.has(token)) {
                throw new Error('Token is invalid or blacklisted');
            }
            return jwt.verify(token);
        }),

        verifyRefreshToken: vi.fn().mockImplementation(async token => {
            if (!token || blacklistedTokens.has(token) || usedRefreshTokens.has(token)) {
                throw new Error('Refresh token is invalid or expired');
            }
            const decoded = jwt.verify(token);
            usedRefreshTokens.add(token);
            return { ...decoded, type: 'refresh' };
        }),

        refreshTokens: vi.fn().mockImplementation(async refreshToken => {
            const decoded = jwt.verify(refreshToken);
            const payload = { userId: decoded.userId, email: decoded.email, role: decoded.role };
            const tokenService = createMockTokenService();
            return tokenService.generateTokenPair(payload);
        }),

        blacklistToken: vi.fn().mockImplementation(async token => {
            blacklistedTokens.add(token);
        }),

        isTokenBlacklisted: vi.fn().mockImplementation(async token => {
            return blacklistedTokens.has(token);
        }),

        revokeAllUserTokens: vi.fn().mockImplementation(async userId => {
            revokedUserTokens.add(userId);
        }),

        isUserTokensRevoked: vi.fn().mockImplementation(async userId => {
            return revokedUserTokens.has(userId);
        }),

        revokeRefreshToken: vi.fn().mockImplementation(async () => {}),

        clearAllForTesting: vi.fn().mockImplementation(async () => {
            blacklistedTokens.clear();
            usedRefreshTokens.clear();
            revokedUserTokens.clear();
        }),

        disconnect: vi.fn().mockImplementation(async () => {}),
    };
};

// ============================================================================
// MOCK SETUP FUNCTIONS
// ============================================================================

export const setupJWTMocks = () => {
    vi.mock('jsonwebtoken', () => createMockJWT());
};

export const setupTokenServiceMocks = () => {
    vi.mock('../../services/TokenService', () => ({
        __esModule: true,
        default: createMockTokenService(),
    }));
};

export const setupAllMocks = () => {
    setupJWTMocks();
    setupTokenServiceMocks();
};
