import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import logger from '../../utils/logger.js';

describe('Logger Module Tests', () => {
    beforeAll(() => {
        logger.info('Starting logger tests');
    });

    afterAll(() => {
        logger.info('Completing logger tests');
    });

    describe('Logger Module Initialization', () => {
        it('should initialize logger without errors', () => {
            expect(logger).toBeDefined();
            expect(typeof logger.info).toBe('function');
            expect(typeof logger.error).toBe('function');
            expect(typeof logger.warn).toBe('function');
            expect(typeof logger.debug).toBe('function');
        });
    });

    describe('Logger Levels', () => {
        it('should log info level', () => {
            expect(() => {
                logger.info('Test info message');
            }).not.toThrow();
        });

        it('should log error level', () => {
            expect(() => {
                logger.error('Test error message');
            }).not.toThrow();
        });

        it('should log warn level', () => {
            expect(() => {
                logger.warn('Test warn message');
            }).not.toThrow();
        });

        it('should log debug level', () => {
            expect(() => {
                logger.debug('Test debug message');
            }).not.toThrow();
        });

        it('should log with metadata', () => {
            expect(() => {
                logger.info('Test with metadata', {
                    userId: 123,
                    action: 'test',
                    timestamp: new Date().toISOString(),
                });
            }).not.toThrow();
        });

        it('should handle errors properly', () => {
            const testError = new Error('Test error');
            expect(() => {
                logger.error('Error occurred', testError);
            }).not.toThrow();
        });

        it('should handle Error instances', () => {
            const error = new Error('Test error message');
            expect(() => {
                logger.error('Caught error', error, { context: 'test' });
            }).not.toThrow();
        });

        it('should handle string errors', () => {
            expect(() => {
                logger.error('String error', 'This is a string error');
            }).not.toThrow();
        });
    });

    describe('Logger Error Handling', () => {
        it('should handle various error types', () => {
            const errors = [
                new Error('Generic error'),
                new TypeError('Type error'),
                new ReferenceError('Reference error'),
                new SyntaxError('Syntax error'),
            ];

            for (const error of errors) {
                expect(() => {
                    logger.error('Caught error', error);
                }).not.toThrow();
            }
        });

        it('should not throw on null/undefined values', () => {
            expect(() => {
                logger.info('Test with undefined', undefined);
                logger.info('Test with null', null);
            }).not.toThrow();
        });
    });

    describe('Convenience exports (B3-01: typed, no any)', () => {
        // These tests import the actual logger module (bypassing vi.mock) so they
        // exercise the real convenience functions rather than the global test mock.

        it('logInfo accepts a message without meta', async () => {
            const { logInfo } = await vi.importActual<typeof import('../../utils/logger.js')>('../../utils/logger.js');
            expect(() => logInfo('info message')).not.toThrow();
        });

        it('logInfo accepts a message with LogMeta', async () => {
            const { logInfo } = await vi.importActual<typeof import('../../utils/logger.js')>('../../utils/logger.js');
            expect(() => logInfo('info with meta', { correlationId: 'abc-123', userId: 42 })).not.toThrow();
        });

        it('logWarn accepts a message with LogMeta', async () => {
            const { logWarn } = await vi.importActual<typeof import('../../utils/logger.js')>('../../utils/logger.js');
            expect(() => logWarn('warn message', { reason: 'rate-limit' })).not.toThrow();
        });

        it('logError accepts an Error instance', async () => {
            const { logError } = await vi.importActual<typeof import('../../utils/logger.js')>('../../utils/logger.js');
            expect(() => logError('error message', new Error('boom'))).not.toThrow();
        });

        it('logError accepts a string error', async () => {
            const { logError } = await vi.importActual<typeof import('../../utils/logger.js')>('../../utils/logger.js');
            expect(() => logError('error message', 'string-error')).not.toThrow();
        });

        it('logDebug accepts a message with LogMeta', async () => {
            const { logDebug } = await vi.importActual<typeof import('../../utils/logger.js')>('../../utils/logger.js');
            expect(() => logDebug('debug message', { query: 'SELECT 1', duration: 5 })).not.toThrow();
        });

        it('logFatal does not call process.exit in test environment', async () => {
            const { logFatal } = await vi.importActual<typeof import('../../utils/logger.js')>('../../utils/logger.js');
            // In NODE_ENV=test, logFatal must NOT exit regardless of shouldExit flag
            expect(() => logFatal('fatal — test env', new Error('fatal error'), {}, true)).not.toThrow();
        });

        it('actual logger defaultMeta includes service name', async () => {
            const { logger: realLogger } =
                await vi.importActual<typeof import('../../utils/logger.js')>('../../utils/logger.js');
            // Winston exposes defaultMeta directly on the logger instance
            const loggerAny = realLogger as unknown as { defaultMeta?: { service?: string } };
            expect(loggerAny.defaultMeta?.service).toBe('api-guide-typescript');
        });

        it('actual logger has at least one transport configured', async () => {
            const { logger: realLogger } =
                await vi.importActual<typeof import('../../utils/logger.js')>('../../utils/logger.js');
            expect(realLogger.transports.length).toBeGreaterThan(0);
        });
    });

    describe('Logger Performance', () => {
        it('should log quickly without blocking', () => {
            const startTime = Date.now();

            for (let i = 0; i < 100; i++) {
                logger.info(`Performance test ${i}`, { iteration: i });
            }

            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(1000); // Should complete within 1 second
        });

        it('should handle large metadata objects', () => {
            const largeObject = {
                data: Array.from({ length: 100 }, (_, i) => ({
                    id: i,
                    name: `Item ${i}`,
                    description: `Description for item ${i}`,
                })),
            };

            expect(() => {
                logger.info('Large object test', largeObject);
            }).not.toThrow();
        });
    });
});
