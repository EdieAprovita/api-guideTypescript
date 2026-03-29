import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock logger so no console noise leaks into the test runner
vi.mock('../../utils/logger.js', () => ({
    default: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
    logWarn: vi.fn(),
    logError: vi.fn(),
    logInfo: vi.fn(),
}));

import { checkSecrets, validateSecrets } from '../../config/envValidation.js';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Minimal valid env — all required secrets present and non-placeholder. */
function validEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
    return {
        NODE_ENV: 'production',
        // 32 random-looking chars, no banned substrings
        JWT_SECRET: 'K9mP2xQzR7vLwNjH4bFdYeAu8cTsG1oI',
        MONGODB_URI: 'mongodb+srv://user:pass@cluster.internal.net/db',
        // SESSION_SECRET and JWT_RESET_SECRET are warnOnly — omitting is fine for error tests
        ...overrides,
    };
}

/** Returns true if any element of the array includes the given substring. */
function includesMsg(arr: string[], substr: string): boolean {
    return arr.some(msg => msg.includes(substr));
}

// ─── checkSecrets ────────────────────────────────────────────────────────────

describe('checkSecrets', () => {
    describe('JWT_SECRET', () => {
        it('errors when JWT_SECRET is missing', () => {
            const { errors } = checkSecrets(validEnv({ JWT_SECRET: undefined }));
            expect(includesMsg(errors, 'JWT_SECRET is not set')).toBe(true);
        });

        it('errors when JWT_SECRET is an empty string', () => {
            const { errors } = checkSecrets(validEnv({ JWT_SECRET: '' }));
            expect(includesMsg(errors, 'JWT_SECRET is not set')).toBe(true);
        });

        it('errors when JWT_SECRET contains "your" (placeholder)', () => {
            const { errors } = checkSecrets(validEnv({ JWT_SECRET: 'your_jwt_key_12345678901234567890' }));
            expect(includesMsg(errors, 'JWT_SECRET')).toBe(true);
            expect(errors.find(e => e.includes('JWT_SECRET'))).toMatch(/placeholder/i);
        });

        it('errors when JWT_SECRET contains "secret" (placeholder)', () => {
            const { errors } = checkSecrets(validEnv({ JWT_SECRET: 'mysecretkey12345678901234567890' }));
            expect(includesMsg(errors, 'JWT_SECRET')).toBe(true);
        });

        it('errors when JWT_SECRET contains "change" (placeholder)', () => {
            const { errors } = checkSecrets(validEnv({ JWT_SECRET: 'change_this_key_before_deploying' }));
            expect(includesMsg(errors, 'JWT_SECRET')).toBe(true);
        });

        it('errors when JWT_SECRET contains "placeholder"', () => {
            const { errors } = checkSecrets(validEnv({ JWT_SECRET: 'placeholder-value-12345678901234' }));
            expect(errors.find(e => e.includes('JWT_SECRET'))).toMatch(/placeholder/i);
        });

        it('errors when JWT_SECRET is shorter than 32 characters', () => {
            const { errors } = checkSecrets(validEnv({ JWT_SECRET: 'tooshort' }));
            expect(includesMsg(errors, 'too short')).toBe(true);
        });

        it('is valid when JWT_SECRET is 32+ chars and not a placeholder', () => {
            const { errors } = checkSecrets(validEnv({ JWT_SECRET: 'X'.repeat(32) }));
            expect(errors.filter(e => e.includes('JWT_SECRET'))).toHaveLength(0);
        });

        it('is valid when JWT_SECRET is exactly 32 characters with no banned pattern', () => {
            const { errors } = checkSecrets(validEnv({ JWT_SECRET: 'ABCdef1234567890ABCdef1234567890' }));
            expect(errors.filter(e => e.includes('JWT_SECRET'))).toHaveLength(0);
        });
    });

    describe('MONGODB_URI', () => {
        it('errors when MONGODB_URI is missing', () => {
            const { errors } = checkSecrets(validEnv({ MONGODB_URI: undefined }));
            expect(includesMsg(errors, 'MONGODB_URI is not set')).toBe(true);
        });

        it('errors when MONGODB_URI is empty', () => {
            const { errors } = checkSecrets(validEnv({ MONGODB_URI: '' }));
            expect(includesMsg(errors, 'MONGODB_URI is not set')).toBe(true);
        });

        it('is valid when MONGODB_URI is non-empty', () => {
            const { errors } = checkSecrets(validEnv());
            expect(errors.filter(e => e.includes('MONGODB_URI'))).toHaveLength(0);
        });
    });

    describe('SESSION_SECRET (warnOnly)', () => {
        it('produces a warning (not an error) when SESSION_SECRET is a placeholder', () => {
            const result = checkSecrets(validEnv({ SESSION_SECRET: 'your_session_key_here_1234567890' }));
            expect(result.errors.filter(e => e.includes('SESSION_SECRET'))).toHaveLength(0);
            expect(result.warnings.filter(w => w.includes('SESSION_SECRET'))).toHaveLength(1);
        });

        it('produces a warning (not an error) when SESSION_SECRET is missing', () => {
            const result = checkSecrets(validEnv({ SESSION_SECRET: undefined }));
            expect(result.errors.filter(e => e.includes('SESSION_SECRET'))).toHaveLength(0);
            expect(result.warnings.filter(w => w.includes('SESSION_SECRET'))).toHaveLength(1);
        });

        it('produces no warning when SESSION_SECRET is valid', () => {
            const result = checkSecrets(validEnv({ SESSION_SECRET: 'Z'.repeat(32) }));
            expect(result.warnings.filter(w => w.includes('SESSION_SECRET'))).toHaveLength(0);
        });
    });

    describe('JWT_RESET_SECRET (warnOnly)', () => {
        it('produces a warning when JWT_RESET_SECRET is missing', () => {
            const result = checkSecrets(validEnv({ JWT_RESET_SECRET: undefined }));
            expect(result.errors.filter(e => e.includes('JWT_RESET_SECRET'))).toHaveLength(0);
            expect(result.warnings.filter(w => w.includes('JWT_RESET_SECRET'))).toHaveLength(1);
        });

        it('produces a warning when JWT_RESET_SECRET is a placeholder', () => {
            const result = checkSecrets(validEnv({ JWT_RESET_SECRET: 'your_reset_key_here_1234567890AB' }));
            expect(result.errors.filter(e => e.includes('JWT_RESET_SECRET'))).toHaveLength(0);
            expect(result.warnings.filter(w => w.includes('JWT_RESET_SECRET'))).toHaveLength(1);
        });

        it('produces no warning when JWT_RESET_SECRET is valid', () => {
            const result = checkSecrets(validEnv({ JWT_RESET_SECRET: 'M3nQ8pXwK2vRzLjH5bNdYeAu7cTfG0oI' }));
            expect(result.warnings.filter(w => w.includes('JWT_RESET_SECRET'))).toHaveLength(0);
        });
    });

    describe('multiple violations', () => {
        it('collects all errors in one call', () => {
            const { errors } = checkSecrets(validEnv({ JWT_SECRET: undefined, MONGODB_URI: undefined }));
            expect(errors.filter(e => e.includes('JWT_SECRET'))).toHaveLength(1);
            expect(errors.filter(e => e.includes('MONGODB_URI'))).toHaveLength(1);
        });
    });
});

// ─── validateSecrets ─────────────────────────────────────────────────────────

describe('validateSecrets', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('is a no-op in test environment', () => {
        // Should not throw even with a completely empty env when NODE_ENV=test
        expect(() => validateSecrets({ NODE_ENV: 'test' })).not.toThrow();
    });

    it('throws in production when secrets are invalid', () => {
        expect(() =>
            validateSecrets({
                NODE_ENV: 'production',
                JWT_SECRET: 'your_jwt_key_here', // placeholder
                MONGODB_URI: 'mongodb://localhost/db',
            })
        ).toThrow(/Invalid or missing secrets/i);
    });

    it('throws in production when JWT_SECRET is missing', () => {
        expect(() =>
            validateSecrets({
                NODE_ENV: 'production',
                MONGODB_URI: 'mongodb://localhost/db',
            })
        ).toThrow(/JWT_SECRET/);
    });

    it('throws in production listing ALL violations in one message', () => {
        let thrownMessage = '';
        try {
            validateSecrets({
                NODE_ENV: 'production',
                JWT_SECRET: undefined,
                MONGODB_URI: undefined,
            });
        } catch (err) {
            thrownMessage = (err as Error).message;
        }
        expect(thrownMessage).toMatch(/JWT_SECRET/);
        expect(thrownMessage).toMatch(/MONGODB_URI/);
    });

    it('does NOT throw in development even with invalid secrets', () => {
        expect(() =>
            validateSecrets({
                NODE_ENV: 'development',
                JWT_SECRET: 'your_jwt_key_here',
                MONGODB_URI: undefined,
            })
        ).not.toThrow();
    });

    it('does NOT throw with a fully valid env in production', () => {
        expect(() => validateSecrets(validEnv())).not.toThrow();
    });

    it('emits warnings for warnOnly secrets in production without throwing', async () => {
        const loggerModule = await import('../../utils/logger.js');
        const logWarnMock = vi.mocked(loggerModule.logWarn);

        expect(() =>
            validateSecrets({
                NODE_ENV: 'production',
                JWT_SECRET: 'K9mP2xQzR7vLwNjH4bFdYeAu8cTsG1oI',
                MONGODB_URI: 'mongodb+srv://user:pass@cluster.internal.net/db',
                JWT_RESET_SECRET: undefined, // warnOnly — should warn but not throw
            })
        ).not.toThrow();

        expect(logWarnMock).toHaveBeenCalledWith(expect.stringContaining('JWT_RESET_SECRET'));
    });
});
