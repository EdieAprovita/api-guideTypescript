import RedisLib from 'ioredis';
import type { Redis as RedisType } from 'ioredis';
const Redis = RedisLib.default || RedisLib;
import logger from '../utils/logger.js';
import { redisRetryStrategy } from '../utils/redisRetryStrategy.js';

// ---------------------------------------------------------------------------
// Circuit Breaker
// ---------------------------------------------------------------------------
export interface CircuitBreakerState {
    state: 'closed' | 'open' | 'half-open';
    failures: number;
    lastFailure: number | null;
    nextRetry: number | null;
}

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 30_000; // 30 seconds
const CIRCUIT_BREAKER_WINDOW_MS = 60_000; // 60 seconds

/**
 * In-process circuit breaker for Redis connections.
 *
 * WARNING  **Multi-replica limitation:** This state is held in the Node.js process
 * memory and is NOT shared across Cloud Run replicas or PM2 worker processes.
 * Each replica maintains its own independent failure count and circuit state.
 * For coordinated circuit breaking across replicas, use a distributed lock
 * or store the state in Redis itself (with a separate, low-latency client).
 */
const circuitBreaker = {
    state: 'closed' as 'closed' | 'open' | 'half-open',
    failureTimestamps: [] as number[],
    lastFailure: null as number | null,
    nextRetry: null as number | null,
};

export function checkAndAdvanceState(): void {
    if (circuitBreaker.state === 'open' && circuitBreaker.nextRetry && Date.now() >= circuitBreaker.nextRetry) {
        circuitBreaker.state = 'half-open';
        circuitBreaker.nextRetry = null;
        logger.info('Redis circuit breaker transitioning to HALF-OPEN');
    }
}

export function getCircuitBreakerState(): CircuitBreakerState {
    const now = Date.now();
    const failures = circuitBreaker.failureTimestamps.filter(ts => now - ts < CIRCUIT_BREAKER_WINDOW_MS).length;
    return {
        state: circuitBreaker.state,
        failures,
        lastFailure: circuitBreaker.lastFailure,
        nextRetry: circuitBreaker.nextRetry,
    };
}

export function recordFailure(): void {
    const now = Date.now();
    // Prune entries outside the sliding window
    circuitBreaker.failureTimestamps = circuitBreaker.failureTimestamps.filter(
        ts => now - ts < CIRCUIT_BREAKER_WINDOW_MS
    );
    circuitBreaker.failureTimestamps.push(now);
    circuitBreaker.lastFailure = now;
    if (circuitBreaker.failureTimestamps.length >= CIRCUIT_BREAKER_THRESHOLD && circuitBreaker.state !== 'open') {
        circuitBreaker.state = 'open';
        circuitBreaker.nextRetry = now + CIRCUIT_BREAKER_RESET_MS;
        logger.warn('Redis circuit breaker OPEN', {
            failures: circuitBreaker.failureTimestamps.length,
        });
    }
}

export function resetCircuitBreaker(): void {
    circuitBreaker.state = 'closed';
    circuitBreaker.failureTimestamps = [];
    circuitBreaker.lastFailure = null;
    circuitBreaker.nextRetry = null;
}

function recordSuccess(): void {
    if (circuitBreaker.state === 'half-open') {
        resetCircuitBreaker();
        logger.info('Redis circuit breaker CLOSED after successful operation');
    } else if (circuitBreaker.failureTimestamps.length > 0) {
        resetCircuitBreaker();
        logger.debug('Redis circuit breaker reset after successful operation');
    }
}

export function isCircuitOpen(): boolean {
    checkAndAdvanceState();
    return circuitBreaker.state === 'open';
}

/**
 * Executes a Redis operation only if the circuit breaker is closed/half-open.
 * Returns null if the circuit is open to fail fast instead of queuing commands.
 */
export async function executeIfCircuitClosed<T>(operation: () => Promise<T>): Promise<T | null> {
    if (isCircuitOpen()) {
        logger.warn('Redis circuit breaker OPEN — skipping operation');
        return null;
    }
    try {
        const result = await operation();
        recordSuccess();
        return result;
    } catch (error) {
        recordFailure();
        throw error;
    }
}

// ---------------------------------------------------------------------------
// Singleton Redis Client
// ---------------------------------------------------------------------------
let sharedClient: RedisType | null = null;

export function getRedisClient(): RedisType {
    if (sharedClient) return sharedClient;

    const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        db: 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        retryStrategy: redisRetryStrategy,
        ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
        ...(process.env.REDIS_TLS === 'true' && { tls: {} }),
    };

    sharedClient = new Redis(redisConfig);

    sharedClient.on('connect', () => {
        logger.info('Redis connected successfully');
    });

    sharedClient.on('ready', () => {
        logger.info('Redis ready to accept commands');
        resetCircuitBreaker();
    });

    sharedClient.on('error', (error: Error) => {
        logger.error('Redis connection error', { error: error.message });
        recordFailure();
    });

    sharedClient.on('reconnecting', () => {
        logger.warn('Redis reconnecting');
    });

    sharedClient.on('close', () => {
        logger.warn('Redis connection closed');
    });

    return sharedClient;
}

/** For testing — disconnect and reset the singleton */
export function resetRedisClient(): void {
    if (sharedClient) {
        sharedClient.disconnect();
        sharedClient = null;
    }
    resetCircuitBreaker();
}
