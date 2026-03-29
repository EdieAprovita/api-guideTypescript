import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the entire app module to prevent the full Express + DB import chain
vi.mock('../../app.js', () => ({
    default: {
        listen: vi.fn().mockReturnValue({ close: vi.fn(), on: vi.fn() }),
    },
}));

// Mock logger to suppress output
vi.mock('../../utils/logger', () => ({
    default: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
    logWarn: vi.fn(),
}));

// Import after mocks are registered
import { validateStartupEnvironment } from '../../server.js';

function spyOnProcessExit() {
    return vi.spyOn(process, 'exit').mockImplementation((_code?: string | number | null | undefined) => {
        throw new Error('process.exit called');
    });
}

describe('validateStartupEnvironment', () => {
    const originalBypass = process.env.BYPASS_AUTH_FOR_TESTING;
    const originalNodeEnv = process.env.NODE_ENV;
    const originalJwtSecret = process.env.JWT_SECRET;
    const originalMongoUri = process.env.MONGODB_URI;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        if (originalNodeEnv !== undefined) {
            process.env.NODE_ENV = originalNodeEnv;
        } else {
            delete process.env.NODE_ENV;
        }
        if (originalBypass !== undefined) {
            process.env.BYPASS_AUTH_FOR_TESTING = originalBypass;
        } else {
            delete process.env.BYPASS_AUTH_FOR_TESTING;
        }
        if (originalJwtSecret !== undefined) {
            process.env.JWT_SECRET = originalJwtSecret;
        } else {
            delete process.env.JWT_SECRET;
        }
        if (originalMongoUri !== undefined) {
            process.env.MONGODB_URI = originalMongoUri;
        } else {
            delete process.env.MONGODB_URI;
        }
        vi.restoreAllMocks();
    });

    it('calls process.exit(1) when BYPASS_AUTH_FOR_TESTING=true and NODE_ENV=production', () => {
        process.env.BYPASS_AUTH_FOR_TESTING = 'true';
        process.env.NODE_ENV = 'production';
        const exitSpy = spyOnProcessExit();

        expect(() => validateStartupEnvironment()).toThrow('process.exit called');
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('calls process.exit(1) when BYPASS_AUTH_FOR_TESTING=true and NODE_ENV=development', () => {
        process.env.BYPASS_AUTH_FOR_TESTING = 'true';
        process.env.NODE_ENV = 'development';
        const exitSpy = spyOnProcessExit();

        expect(() => validateStartupEnvironment()).toThrow('process.exit called');
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('does NOT call process.exit when BYPASS_AUTH_FOR_TESTING=true and NODE_ENV=test', () => {
        process.env.BYPASS_AUTH_FOR_TESTING = 'true';
        process.env.NODE_ENV = 'test';
        const exitSpy = spyOnProcessExit();

        expect(() => validateStartupEnvironment()).not.toThrow();
        expect(exitSpy).not.toHaveBeenCalled();
    });

    it('does NOT call process.exit when BYPASS_AUTH_FOR_TESTING is unset', () => {
        delete process.env.BYPASS_AUTH_FOR_TESTING;
        process.env.NODE_ENV = 'production';
        // Provide valid secrets so the env-validation step does not throw
        process.env.JWT_SECRET = 'K9mP2xQzR7vLwNjH4bFdYeAu8cTsG1oI';
        process.env.MONGODB_URI = 'mongodb+srv://user:pass@cluster.internal.net/db';
        const exitSpy = spyOnProcessExit();

        expect(() => validateStartupEnvironment()).not.toThrow();
        expect(exitSpy).not.toHaveBeenCalled();
    });
});
