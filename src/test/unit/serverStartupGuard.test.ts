import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the entire app module to prevent the full Express + DB import chain
vi.mock('../../app.js', () => ({
    default: {
        listen: vi.fn().mockReturnValue({ close: vi.fn() }),
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

describe('validateStartupEnvironment', () => {
    const originalBypass = process.env.BYPASS_AUTH_FOR_TESTING;
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        // Restore original env values
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
        vi.restoreAllMocks();
    });

    it('calls process.exit(1) when BYPASS_AUTH_FOR_TESTING=true and NODE_ENV=production', () => {
        process.env.BYPASS_AUTH_FOR_TESTING = 'true';
        process.env.NODE_ENV = 'production';

        const exitSpy = vi
            .spyOn(process, 'exit')
            .mockImplementation((_code?: string | number | null | undefined) => {
                throw new Error('process.exit called');
            });

        expect(() => validateStartupEnvironment()).toThrow('process.exit called');
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('does NOT call process.exit when BYPASS_AUTH_FOR_TESTING=true and NODE_ENV=test', () => {
        process.env.BYPASS_AUTH_FOR_TESTING = 'true';
        process.env.NODE_ENV = 'test';

        const exitSpy = vi
            .spyOn(process, 'exit')
            .mockImplementation((_code?: string | number | null | undefined) => {
                throw new Error('process.exit called');
            });

        expect(() => validateStartupEnvironment()).not.toThrow();
        expect(exitSpy).not.toHaveBeenCalled();
    });

    it('does NOT call process.exit when BYPASS_AUTH_FOR_TESTING is unset', () => {
        delete process.env.BYPASS_AUTH_FOR_TESTING;
        process.env.NODE_ENV = 'production';

        const exitSpy = vi
            .spyOn(process, 'exit')
            .mockImplementation((_code?: string | number | null | undefined) => {
                throw new Error('process.exit called');
            });

        expect(() => validateStartupEnvironment()).not.toThrow();
        expect(exitSpy).not.toHaveBeenCalled();
    });
});
