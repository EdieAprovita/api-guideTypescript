import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    executeIfCircuitClosed,
    getCircuitBreakerState,
    getRedisClient,
    recordFailure,
    resetCircuitBreaker,
    resetRedisClient,
} from '../../clients/redisClient.js';

// ---------------------------------------------------------------------------
// Circuit breaker — existing tests
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// H-03 — Sliding window circuit breaker
// ---------------------------------------------------------------------------
describe('sliding window circuit breaker (H-03)', () => {
    const BASE_TIME = new Date('2026-04-02T10:00:00.000Z').getTime();
    let dateNowSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(BASE_TIME);
        resetCircuitBreaker();
    });

    afterEach(() => {
        resetCircuitBreaker();
        dateNowSpy.mockRestore();
    });

    it('prunes timestamps older than 60 s so they do not count toward the threshold', () => {
        // Record 4 failures at t=0
        for (let i = 0; i < 4; i++) {
            recordFailure();
        }
        expect(getCircuitBreakerState().failures).toBe(4);
        expect(getCircuitBreakerState().state).toBe('closed');

        // Advance time by 61 seconds — those 4 failures are now outside the window
        dateNowSpy.mockReturnValue(BASE_TIME + 61_000);

        // Record 1 more failure — only this new one is within the window
        recordFailure();

        expect(getCircuitBreakerState().failures).toBe(1);
        expect(getCircuitBreakerState().state).toBe('closed');
    });

    it('opens the circuit only when threshold is reached within the 60-second window', () => {
        // Record 4 failures at t=0
        for (let i = 0; i < 4; i++) {
            recordFailure();
        }

        // Advance past the window so those failures are stale
        dateNowSpy.mockReturnValue(BASE_TIME + 61_000);

        // Record 4 more within the new window — should NOT open (only 4, threshold is 5)
        for (let i = 0; i < 4; i++) {
            recordFailure();
        }
        expect(getCircuitBreakerState().state).toBe('closed');

        // One more brings it to 5 within window — should open
        recordFailure();
        expect(getCircuitBreakerState().state).toBe('open');
        expect(getCircuitBreakerState().failures).toBe(5);
    });

    it('getCircuitBreakerState().failures returns count within window (backward compat)', () => {
        for (let i = 0; i < 3; i++) {
            recordFailure();
        }

        // Advance 61 s — those 3 are stale
        dateNowSpy.mockReturnValue(BASE_TIME + 61_000);

        // Add 2 fresh failures
        for (let i = 0; i < 2; i++) {
            recordFailure();
        }

        expect(getCircuitBreakerState().failures).toBe(2);
    });

    it('re-trips circuit from half-open to open on next failure', async () => {
        // Open the circuit
        for (let i = 0; i < 5; i++) {
            recordFailure();
        }
        expect(getCircuitBreakerState().state).toBe('open');

        // Advance past reset timeout so the breaker transitions to half-open
        dateNowSpy.mockReturnValue(BASE_TIME + 31_000);

        // Attempt fails — should re-open the circuit
        await expect(
            executeIfCircuitClosed(async () => {
                throw new Error('probe failed');
            })
        ).rejects.toThrow('probe failed');

        expect(getCircuitBreakerState().state).toBe('open');
    });
});

// ---------------------------------------------------------------------------
// C-03 — Redis TLS support
// ---------------------------------------------------------------------------
// ioredis is mocked locally so getRedisClient() can be called without a real
// server. The mock captures the constructor arguments so we can assert that
// the `tls` option is present or absent as required.
vi.mock('ioredis', () => {
    const RedisMock = vi.fn().mockImplementation(() => ({
        on: vi.fn(),
        disconnect: vi.fn(),
    }));
    return { default: RedisMock };
});

describe('getRedisClient TLS config (C-03)', () => {
    beforeEach(async () => {
        resetRedisClient();
        vi.clearAllMocks();
    });

    afterEach(() => {
        resetRedisClient();
        delete process.env.REDIS_TLS;
    });

    it('passes tls option to ioredis constructor when REDIS_TLS=true', async () => {
        const { default: RedisMock } = await import('ioredis');
        process.env.REDIS_TLS = 'true';

        getRedisClient();

        expect(RedisMock).toHaveBeenCalledOnce();
        const constructorArg = (RedisMock as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(constructorArg).toHaveProperty('tls');
    });

    it('omits tls option from ioredis constructor when REDIS_TLS is not set', async () => {
        const { default: RedisMock } = await import('ioredis');
        delete process.env.REDIS_TLS;

        getRedisClient();

        expect(RedisMock).toHaveBeenCalledOnce();
        const constructorArg = (RedisMock as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(constructorArg).not.toHaveProperty('tls');
    });

    it('omits tls option from ioredis constructor when REDIS_TLS=false', async () => {
        const { default: RedisMock } = await import('ioredis');
        process.env.REDIS_TLS = 'false';

        getRedisClient();

        expect(RedisMock).toHaveBeenCalledOnce();
        const constructorArg = (RedisMock as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(constructorArg).not.toHaveProperty('tls');
    });
});
