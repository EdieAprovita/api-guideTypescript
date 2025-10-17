import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import logger from '../../utils/logger';

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
