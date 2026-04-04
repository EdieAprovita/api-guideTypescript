import type { Redis } from 'ioredis';
import type { MockRedisEntry, PipelineClient } from './tokenTypes.js';

let mockRedisStorage: Map<string, MockRedisEntry> = new Map<string, MockRedisEntry>();

/**
 * Creates a minimal in-memory Redis mock suitable for unit tests.
 * Shares a module-level Map so all TokenService instances in the same
 * test process operate on the same store (preserving the original semantics).
 */
export function createMockRedis(): Redis {
    // Minimal pipeline stub: collects commands and executes them on exec()
    const makePipeline = () => {
        const commands: Array<() => Promise<[null, unknown]>> = [];
        const pipe = {
            ttl: (key: string) => {
                commands.push(async () => {
                    const entry = mockRedisStorage.get(key);
                    if (!entry) return [null, -2] as [null, number];
                    const remaining = Math.floor((entry.expiry - Date.now()) / 1000);
                    return [null, remaining > 0 ? remaining : -1] as [null, number];
                });
                return pipe;
            },
            del: (key: string) => {
                commands.push(async () => {
                    const existed = mockRedisStorage.has(key);
                    mockRedisStorage.delete(key);
                    return [null, existed ? 1 : 0] as [null, number];
                });
                return pipe;
            },
            exec: async () => Promise.all(commands.map(fn => fn())),
        };
        return pipe as unknown as PipelineClient;
    };

    return {
        setex: (key: string, seconds: number, value: string) => {
            const expiry = Date.now() + seconds * 1000;
            mockRedisStorage.set(key, { value, expiry });
            return Promise.resolve('OK');
        },
        get: (key: string) => {
            const entry = mockRedisStorage.get(key);
            if (!entry || Date.now() > entry.expiry) {
                mockRedisStorage.delete(key);
                return Promise.resolve(null);
            }
            return Promise.resolve(entry.value);
        },
        del: (key: string) => {
            const existed = mockRedisStorage.has(key);
            mockRedisStorage.delete(key);
            return Promise.resolve(existed ? 1 : 0);
        },
        scan: (_cursor: string, _matchArg: string, pattern: string, _countArg: string, _count: number) => {
            const allKeys = Array.from(mockRedisStorage.keys());
            const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
            const regex = new RegExp(`^${escaped}$`);
            const matched = allKeys.filter(key => regex.test(key));
            // Return all results in one shot (cursor '0' = done)
            return Promise.resolve(['0', matched] as [string, string[]]);
        },
        ttl: (key: string) => {
            const entry = mockRedisStorage.get(key);
            if (!entry) return Promise.resolve(-2);

            const remainingTime = Math.floor((entry.expiry - Date.now()) / 1000);
            return Promise.resolve(remainingTime > 0 ? remainingTime : -1);
        },
        pipeline: makePipeline,
        disconnect: () => {
            mockRedisStorage.clear();
            return Promise.resolve();
        },
        flushall: () => {
            mockRedisStorage.clear();
            return Promise.resolve('OK');
        },
    } as unknown as Redis;
}
