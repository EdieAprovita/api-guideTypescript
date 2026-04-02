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

const circuitBreaker: CircuitBreakerState = {
    state: 'closed',
    failures: 0,
    lastFailure: null,
    nextRetry: null,
};

export function getCircuitBreakerState(): CircuitBreakerState {
    if (circuitBreaker.state === 'open' && circuitBreaker.nextRetry && Date.now() >= circuitBreaker.nextRetry) {
        circuitBreaker.state = 'half-open';
    }
    return { ...circuitBreaker };
}

export function recordFailure(): void {
    circuitBreaker.failures++;
    circuitBreaker.lastFailure = Date.now();
    if (circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
        circuitBreaker.state = 'open';
        circuitBreaker.nextRetry = Date.now() + CIRCUIT_BREAKER_RESET_MS;
        logger.warn('Redis circuit breaker OPEN', { failures: circuitBreaker.failures });
    }
}

export function resetCircuitBreaker(): void {
    circuitBreaker.state = 'closed';
    circuitBreaker.failures = 0;
    circuitBreaker.lastFailure = null;
    circuitBreaker.nextRetry = null;
}

export function isCircuitOpen(): boolean {
    return getCircuitBreakerState().state === 'open';
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
