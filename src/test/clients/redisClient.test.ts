import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    executeIfCircuitClosed,
    getCircuitBreakerState,
    recordFailure,
    resetCircuitBreaker,
} from '../../clients/redisClient.js';

describe('redisClient circuit breaker', () => {
    let dateNowSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-02T10:00:00.000Z').getTime());
        resetCircuitBreaker();
    });

    afterEach(() => {
        resetCircuitBreaker();
        dateNowSpy.mockRestore();
    });

    it('closes the breaker after a successful half-open operation', async () => {
        for (let i = 0; i < 5; i++) {
            recordFailure();
        }

        expect(getCircuitBreakerState().state).toBe('open');

        dateNowSpy.mockReturnValue(new Date('2026-04-02T10:00:31.000Z').getTime());

        const result = await executeIfCircuitClosed(async () => 'PONG');

        expect(result).toBe('PONG');
        expect(getCircuitBreakerState().state).toBe('closed');
        expect(getCircuitBreakerState().failures).toBe(0);
    });

    it('fails fast while the breaker is open and the retry window has not elapsed', async () => {
        for (let i = 0; i < 5; i++) {
            recordFailure();
        }

        const result = await executeIfCircuitClosed(async () => 'should-not-run');

        expect(result).toBeNull();
        expect(getCircuitBreakerState().state).toBe('open');
    });
});
