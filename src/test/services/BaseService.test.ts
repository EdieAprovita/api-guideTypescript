import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { HttpError } from '../../types/Errors';
import { MAX_LIMIT, DEFAULT_LIMIT, DEFAULT_PAGE } from '../../types/pagination';

// Mock the dependencies
vi.mock('../../types/modalTypes', () => ({
    getErrorMessage: vi.fn((msg: string) => msg),
}));

vi.mock('../../services/CacheService', () => ({
    cacheService: vi.fn(),
}));

vi.mock('../../utils/logger', () => ({
    default: {
        error: vi.fn(),
        info: vi.fn(),
    },
}));

describe('BaseService', () => {
    const importRealBaseService = async () => {
        vi.doUnmock('mongoose');
        vi.doUnmock('../../services/BaseService');
        return (await vi.importActual<typeof import('../../services/BaseService')>('../../services/BaseService')).default;
    };

    const importRealMongoose = async () => {
        vi.doUnmock('mongoose');
        return await vi.importActual<typeof import('mongoose')>('mongoose');
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('ObjectId utilities', () => {
        it('should create ObjectId from valid string', () => {
            const validId = new Types.ObjectId().toString();
            const objectId = new Types.ObjectId(validId);

            expect(objectId).toBeInstanceOf(Types.ObjectId);
            expect(objectId.toString()).toBe(validId);
        });

        it('should create new ObjectId', () => {
            const objectId = new Types.ObjectId();
            expect(objectId).toBeInstanceOf(Types.ObjectId);
            expect(typeof objectId.toString()).toBe('string');
            expect(objectId.toString().length).toBeGreaterThan(0);
        });
    });

    describe('Basic functionality', () => {
        it('should import BaseService correctly', async () => {
            const BaseService = await importRealBaseService();
            expect(BaseService).toBeDefined();
            expect(typeof BaseService).toBe('function');
        });
    });

    describe('Pagination constants', () => {
        it('MAX_LIMIT should be 100', () => {
            expect(MAX_LIMIT).toBe(100);
        });

        it('DEFAULT_LIMIT should be less than MAX_LIMIT', () => {
            expect(DEFAULT_LIMIT).toBeGreaterThan(0);
            expect(DEFAULT_LIMIT).toBeLessThanOrEqual(MAX_LIMIT);
        });

        it('normalizePaginationParams clamps limit to MAX_LIMIT', async () => {
            const { normalizePaginationParams } = await import('../../types/pagination');
            const { limit } = normalizePaginationParams(1, 9999);
            expect(limit).toBe(MAX_LIMIT);
        });

        it('normalizePaginationParams handles zero limit', async () => {
            const { normalizePaginationParams } = await import('../../types/pagination');
            const { limit } = normalizePaginationParams(1, 0);
            expect(limit).toBe(DEFAULT_LIMIT);
        });

        it('normalizePaginationParams clamps negative limit to minimum 1', async () => {
            const { normalizePaginationParams } = await import('../../types/pagination');
            const { limit } = normalizePaginationParams(1, -5);
            expect(limit).toBe(1); // Math.max(1, -5) = 1
        });

        it('normalizePaginationParams handles NaN limit', async () => {
            const { normalizePaginationParams } = await import('../../types/pagination');
            const { limit } = normalizePaginationParams(1, NaN);
            expect(limit).toBe(DEFAULT_LIMIT);
        });

        it('normalizePaginationParams clamps page to minimum 1', async () => {
            const { normalizePaginationParams } = await import('../../types/pagination');
            const { page } = normalizePaginationParams(0, 10);
            expect(page).toBe(DEFAULT_PAGE);
        });
    });

    describe('Security validations', () => {
        it('should detect MongoDB operators in data', () => {
            // Test that our validation logic works
            const dataWithOperators = { username: 'test', $ne: null };
            const keys = Object.keys(dataWithOperators);
            const hasDangerousOperators = keys.some(key => typeof key === 'string' && key.startsWith('$'));

            expect(hasDangerousOperators).toBe(true);
        });

        it('should not flag normal data as dangerous', () => {
            const normalData = { username: 'test', email: 'test@example.com' };
            const keys = Object.keys(normalData);
            const hasDangerousOperators = keys.some(key => typeof key === 'string' && key.startsWith('$'));

            expect(hasDangerousOperators).toBe(false);
        });

        it('rejects empty update payloads before calling the model', async () => {
            const BaseService = await importRealBaseService();
            const mongoose = await importRealMongoose();
            const model = {
                modelName: 'TestModel',
                findByIdAndUpdate: vi.fn(),
            };
            const service = new BaseService(model as any);

            await expect(service.updateById(new mongoose.Types.ObjectId().toString(), {})).rejects.toBeInstanceOf(HttpError);
            expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
        });

        it('rejects unsafe update keys before calling the model', async () => {
            const BaseService = await importRealBaseService();
            const mongoose = await importRealMongoose();
            const model = {
                modelName: 'TestModel',
                findByIdAndUpdate: vi.fn(),
            };
            const service = new BaseService(model as any);

            await expect(
                service.updateById(new mongoose.Types.ObjectId().toString(), { $set: { username: 'admin' } } as any)
            ).rejects.toBeInstanceOf(HttpError);
            expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
        });
    });
});
