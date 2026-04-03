import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { reviewService } from '../../services/ReviewService.js';
import { Review } from '../../models/Review.js';
import { HttpError, HttpStatusCode } from '../../types/Errors.js';
import { cacheService } from '../../services/CacheService.js';
import logger from '../../utils/logger.js';

// ---------------------------------------------------------------------------
// Shared mocked types
// ---------------------------------------------------------------------------
interface MockedCacheService {
    get: MockedFunction<(key: string) => Promise<unknown>>;
    setWithTags: MockedFunction<(key: string, value: unknown, tags: string[], ttl?: number) => Promise<void>>;
    invalidateByTag: MockedFunction<(tag: string) => Promise<void>>;
}

interface MockedReviewModel {
    find: MockedFunction<
        () => {
            sort: MockedFunction<
                () => { limit: MockedFunction<() => { populate: MockedFunction<() => Promise<unknown[]>> }> }
            >;
        }
    >;
    findById: MockedFunction<(id: string) => { populate: MockedFunction<() => Promise<unknown>> } | null>;
    findOne: MockedFunction<() => Promise<unknown>>;
    create: MockedFunction<(data: unknown[], opts: unknown) => Promise<unknown[]>>;
    findByIdAndUpdate: MockedFunction<() => unknown>;
    findByIdAndDelete: MockedFunction<() => Promise<void>>;
    aggregate: MockedFunction<() => Promise<unknown[]>>;
    countDocuments: MockedFunction<() => Promise<number>>;
}

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('../../services/CacheService.js', () => ({
    cacheService: {
        get: vi.fn(),
        setWithTags: vi.fn(),
        invalidateByTag: vi.fn(),
    },
}));

vi.mock('../../models/Review.js', () => ({
    Review: {
        find: vi.fn(),
        findById: vi.fn(),
        findOne: vi.fn(),
        create: vi.fn(),
        findByIdAndUpdate: vi.fn(),
        findByIdAndDelete: vi.fn(),
        aggregate: vi.fn(),
        countDocuments: vi.fn(),
    },
}));

vi.mock('../../utils/logger.js', () => ({
    default: {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('mongoose', () => {
    const objectId = Object.assign(
        vi.fn((id?: string) => ({
            toString: () => id ?? '507f1f77bcf86cd799439011',
        })),
        {
            isValid: vi.fn(() => true),
        }
    );

    const types = { ObjectId: objectId };

    return {
        default: {
            Types: types,
            Model: class {},
        },
        startSession: vi.fn(() => ({
            withTransaction: vi.fn((fn: () => Promise<unknown>) => fn()),
            endSession: vi.fn(),
        })),
        Types: types,
    };
});

const mockedCache = cacheService as unknown as MockedCacheService;
const mockedReview = Review as unknown as MockedReviewModel;
const mockedLogger = logger as { warn: MockedFunction<typeof logger.warn> };

// ---------------------------------------------------------------------------
// C-07 — getTopRatedReviews entity-type validation
// ---------------------------------------------------------------------------
describe('C-07 — getTopRatedReviews entity type validation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedCache.get.mockResolvedValue(null);
    });

    it('rejects an invalid entity type with HttpError 400', async () => {
        await expect(reviewService.getTopRatedReviews('InvalidType')).rejects.toThrow(HttpError);

        try {
            await reviewService.getTopRatedReviews('InvalidType');
        } catch (err) {
            expect(err).toBeInstanceOf(HttpError);
            if (err instanceof HttpError) {
                expect(err.statusCode).toBe(HttpStatusCode.BAD_REQUEST);
                expect(err.message).toContain('Invalid entity type');
            }
        }
    });

    it('rejects stale divergent types that no longer exist in reviewPolicies (e.g. "profession")', async () => {
        await expect(reviewService.getTopRatedReviews('profession')).rejects.toThrow(HttpError);
    });

    it('accepts a lowercase valid type after normalization ("restaurant" -> "Restaurant")', async () => {
        mockedReview.find.mockReturnValue({
            sort: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                    populate: vi.fn().mockResolvedValue([]),
                }),
            }),
        });

        await expect(reviewService.getTopRatedReviews('restaurant')).resolves.toEqual([]);
    });

    it('accepts an UPPERCASE valid type after normalization ("RESTAURANT" -> "Restaurant")', async () => {
        mockedReview.find.mockReturnValue({
            sort: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                    populate: vi.fn().mockResolvedValue([]),
                }),
            }),
        });

        await expect(reviewService.getTopRatedReviews('RESTAURANT')).resolves.toEqual([]);
    });

    it('accepts all canonical VALID_ENTITY_TYPES', async () => {
        const types = ['Restaurant', 'Recipe', 'Market', 'Business', 'Doctor', 'Sanctuary'];

        for (const type of types) {
            vi.clearAllMocks();
            mockedCache.get.mockResolvedValue(null);
            mockedReview.find.mockReturnValue({
                sort: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                        populate: vi.fn().mockResolvedValue([]),
                    }),
                }),
            });

            await expect(reviewService.getTopRatedReviews(type)).resolves.toEqual([]);
        }
    });
});

// ---------------------------------------------------------------------------
// C-06 — invalidateReviewCache retry behaviour (via addReview)
// ---------------------------------------------------------------------------
describe('C-06 — cache invalidation retry', () => {
    const entityId = '507f1f77bcf86cd799439011';
    const authorId = '507f1f77bcf86cd799439012';

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('invalidation retries and succeeds on second attempt after first failure', async () => {
        vi.useFakeTimers();

        const committedReview = {
            _id: '507f1f77bcf86cd799439099',
            entityType: 'Restaurant',
            entity: { toString: () => entityId },
            author: { _id: authorId },
            rating: 5,
        };

        mockedReview.findOne.mockResolvedValue(null);
        mockedReview.create.mockResolvedValue([committedReview]);
        mockedReview.findById.mockReturnValue({
            populate: vi.fn().mockResolvedValue(committedReview),
        });

        // First call throws; subsequent calls succeed
        mockedCache.invalidateByTag.mockRejectedValueOnce(new Error('Redis timeout')).mockResolvedValue(undefined);

        const promise = reviewService.addReview({
            entityType: 'Restaurant',
            entity: entityId as unknown as never,
            author: authorId as unknown as never,
            rating: 5,
        });

        // Advance past the 500ms retry delay
        await vi.runAllTimersAsync();
        await promise;

        vi.useRealTimers();

        // Retry verifications: invalidateByTag called more than once
        expect(mockedCache.invalidateByTag.mock.calls.length).toBeGreaterThan(1);
    });

    it('does not throw when both invalidation attempts fail — logs warning instead', async () => {
        vi.useFakeTimers();

        const committedReview = {
            _id: '507f1f77bcf86cd799439099',
            entityType: 'Restaurant',
            entity: { toString: () => entityId },
            author: { _id: authorId },
            rating: 4,
        };

        mockedReview.findOne.mockResolvedValue(null);
        mockedReview.create.mockResolvedValue([committedReview]);
        mockedReview.findById.mockReturnValue({
            populate: vi.fn().mockResolvedValue(committedReview),
        });

        // All calls reject — both attempts exhausted
        mockedCache.invalidateByTag.mockRejectedValue(new Error('Redis down'));

        const promise = reviewService.addReview({
            entityType: 'Restaurant',
            entity: entityId as unknown as never,
            author: authorId as unknown as never,
            rating: 4,
        });

        await vi.runAllTimersAsync();
        // Should resolve (not throw) because invalidation failure is non-fatal
        await expect(promise).resolves.toBeDefined();

        vi.useRealTimers();

        // Verify observability: logger.warn is called when retries are exhausted
        expect(mockedLogger.warn).toHaveBeenCalledWith(
            'Cache invalidation failed after 2 attempts',
            expect.objectContaining({ entityType: 'Restaurant', entityId })
        );
    });
});

// ---------------------------------------------------------------------------
// H-10 — addReview cache tags use committed document values, not input data
// ---------------------------------------------------------------------------
describe('H-10 — addReview cache tags use committed document fields', () => {
    const inputEntityId = '507f1f77bcf86cd799439011';
    const committedEntityId = '507f1f77bcf86cd799439099'; // different from input
    const authorId = '507f1f77bcf86cd799439012';

    beforeEach(() => {
        vi.clearAllMocks();
        mockedCache.invalidateByTag.mockResolvedValue(undefined);
    });

    it('uses review.entityType from committed doc, not reviewData.entityType', async () => {
        const committedReview = {
            _id: '507f1f77bcf86cd799439088',
            entityType: 'Market', // committed value
            entity: { toString: () => committedEntityId },
            author: { _id: authorId },
            rating: 3,
        };

        mockedReview.findOne.mockResolvedValue(null);
        mockedReview.create.mockResolvedValue([committedReview]);
        mockedReview.findById.mockReturnValue({
            populate: vi.fn().mockResolvedValue(committedReview),
        });

        await reviewService.addReview({
            entityType: 'Market',
            entity: inputEntityId as unknown as never,
            author: authorId as unknown as never,
            rating: 3,
        });

        // Cache invalidation must reference the committed entityId, not inputEntityId
        const tagCalls = (
            mockedCache.invalidateByTag as MockedFunction<(tag: string) => Promise<void>>
        ).mock.calls.flat();
        const entityTagExists = tagCalls.some(tag => tag.includes(committedEntityId));
        expect(entityTagExists).toBe(true);

        // Must NOT use the raw input entity id when they differ
        const rawInputTagExists = tagCalls.some(tag => tag.includes(inputEntityId) && !tag.includes(committedEntityId));
        expect(rawInputTagExists).toBe(false);
    });

    it('invalidateByTag is called with entity id from the saved document', async () => {
        const savedEntityId = '507f1f77bcf86cd799439077';

        const committedReview = {
            _id: '507f1f77bcf86cd799439088',
            entityType: 'Business',
            entity: { toString: () => savedEntityId },
            author: { _id: authorId },
            rating: 5,
        };

        mockedReview.findOne.mockResolvedValue(null);
        mockedReview.create.mockResolvedValue([committedReview]);
        mockedReview.findById.mockReturnValue({
            populate: vi.fn().mockResolvedValue(committedReview),
        });

        await reviewService.addReview({
            entityType: 'Business',
            entity: savedEntityId as unknown as never,
            author: authorId as unknown as never,
            rating: 5,
        });

        expect(mockedCache.invalidateByTag).toHaveBeenCalledWith(expect.stringContaining(savedEntityId));
    });
});
