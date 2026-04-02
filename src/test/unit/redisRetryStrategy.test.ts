import { describe, it, expect } from 'vitest';
import { redisRetryStrategy } from '../../utils/redisRetryStrategy.js';

describe('redisRetryStrategy', () => {
    describe('linear backoff delay calculation', () => {
        it('should return 200ms delay on the first attempt', () => {
            expect(redisRetryStrategy(1)).toBe(200);
        });

        it('should return 400ms on the second attempt', () => {
            expect(redisRetryStrategy(2)).toBe(400);
        });

        it('should scale linearly: attempt N yields N * 200ms', () => {
            expect(redisRetryStrategy(5)).toBe(1000);
            expect(redisRetryStrategy(10)).toBe(2000);
        });
    });

    describe('linear backoff cap behaviour', () => {
        it('should return 2000ms at max retry attempt (times=10) — the 3000ms cap is unreachable within the 10-retry window', () => {
            // The formula is Math.min(times * 200, 3000).
            // With a max of 10 retries, the highest possible delay is 10 * 200 = 2000ms,
            // so the 3000ms ceiling is never reached within the configured retry window.
            expect(redisRetryStrategy(10)).toBe(2000);
        });

        it('should return null for times > 10 (max retries takes precedence over cap)', () => {
            // times=15 and 16 exceed max retries, so null returned before cap logic
            expect(redisRetryStrategy(15)).toBeNull();
            expect(redisRetryStrategy(16)).toBeNull();
        });

        it('should never exceed 3000ms for attempts within bounds', () => {
            for (let i = 1; i <= 10; i++) {
                const result = redisRetryStrategy(i);
                expect(result).not.toBeNull();
                expect(result as number).toBeLessThanOrEqual(3000);
            }
        });
    });

    describe('max retries', () => {
        it('should return null after the 10th attempt (times > 10)', () => {
            expect(redisRetryStrategy(11)).toBeNull();
        });

        it('should return null for any attempt beyond 10', () => {
            expect(redisRetryStrategy(12)).toBeNull();
            expect(redisRetryStrategy(50)).toBeNull();
            expect(redisRetryStrategy(100)).toBeNull();
        });

        it('should still return a number on the 10th attempt (boundary)', () => {
            expect(typeof redisRetryStrategy(10)).toBe('number');
        });
    });

    describe('return type', () => {
        it('should return a number for every attempt 1-10', () => {
            for (let i = 1; i <= 10; i++) {
                expect(typeof redisRetryStrategy(i)).toBe('number');
            }
        });

        it('should return null (not undefined) when max retries exceeded', () => {
            const result = redisRetryStrategy(11);
            expect(result).toBeNull();
            expect(result).not.toBeUndefined();
        });
    });
});
