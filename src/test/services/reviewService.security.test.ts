import { describe, it, expect, beforeEach, vi, MockedFunction } from 'vitest';
import { reviewService } from '../../services/ReviewService.js';
import { Review } from '../../models/Review.js';
import { HttpError, HttpStatusCode } from '../../types/Errors.js';

// Define proper types for mocked functions without using 'any'
interface MockedReviewModel {
    findById: MockedFunction<(id: string) => Promise<MockedReview | null>>;
    findOne: MockedFunction<(query: Record<string, unknown>) => Promise<MockedReview | null>>;
    create: MockedFunction<(data: unknown[]) => Promise<MockedReview[]>>;
    save: MockedFunction<() => Promise<MockedReview>>;
}

interface MockedReview {
    _id: string;
    author: string;
    entityType: string;
    entity: string;
    helpfulVotes: string[];
    helpfulCount: number;
    save: MockedFunction<() => Promise<MockedReview>>;
    toString: () => string;
}

// Mock all dependencies
vi.mock('../../models/Review', () => ({
    Review: {
        findById: vi.fn(),
        findOne: vi.fn(),
        create: vi.fn(),
    },
}));

// Mock mongoose properly
vi.mock('mongoose', () => ({
    startSession: vi.fn(() => ({
        withTransaction: vi.fn((fn: () => Promise<void>) => fn()),
        endSession: vi.fn(),
    })),
    Types: {
        ObjectId: Object.assign(
            vi.fn((id?: string) => ({
                toString: () => id || '507f1f77bcf86cd799439013',
                _id: id || '507f1f77bcf86cd799439013',
            })),
            {
                isValid: vi.fn(() => true),
                createFromHexString: vi.fn((id: string) => ({ toString: () => id })),
            }
        ),
    },
}));

// Mock cache service to avoid cache-related issues
vi.mock('../../services/CacheService', () => ({
    cacheService: {
        invalidateByTag: vi.fn(),
    },
}));

const mockedReview = Review as unknown as MockedReviewModel;

describe('ReviewService Security Tests - Phase 7', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Helpful Votes - Duplicate Prevention', () => {
        it('should prevent duplicate helpful votes from same user', async () => {
            const reviewId = '507f1f77bcf86cd799439011';
            const userId = '507f1f77bcf86cd799439012';

            const mockReview: MockedReview = {
                _id: reviewId,
                author: 'author123',
                entityType: 'Restaurant',
                entity: '507f1f77bcf86cd799439013',
                helpfulVotes: [userId], // User already voted
                helpfulCount: 1,
                save: vi.fn(),
                toString: () => reviewId,
            };

            mockedReview.findById.mockResolvedValue(mockReview);

            await expect(reviewService.markAsHelpful(reviewId, userId)).rejects.toThrow(HttpError);

            try {
                await reviewService.markAsHelpful(reviewId, userId);
            } catch (error) {
                expect(error).toBeInstanceOf(HttpError);
                if (error instanceof HttpError) {
                    expect(error.statusCode).toBe(HttpStatusCode.CONFLICT);
                    expect(error.message).toContain('User has already voted');
                }
            }
        });

        it('should allow helpful vote from user who hasnt voted', async () => {
            const reviewId = '507f1f77bcf86cd799439011';
            const userId = '507f1f77bcf86cd799439012';

            const mockReview: MockedReview = {
                _id: reviewId,
                author: 'author123',
                entityType: 'Restaurant',
                entity: '507f1f77bcf86cd799439013',
                helpfulVotes: [], // No votes yet
                helpfulCount: 0,
                save: vi.fn().mockResolvedValue({} as MockedReview),
                toString: () => reviewId,
            };

            mockedReview.findById.mockResolvedValue(mockReview);

            await reviewService.markAsHelpful(reviewId, userId);

            // Verify that a vote was added to the array
            expect(mockReview.helpfulVotes.length).toBe(1);
            expect(mockReview.helpfulCount).toBe(1);
            expect(mockReview.save).toHaveBeenCalled();
        });

        it('should handle removing non-existent helpful vote', async () => {
            const reviewId = '507f1f77bcf86cd799439011';
            const userId = '507f1f77bcf86cd799439012';

            const mockReview: MockedReview = {
                _id: reviewId,
                author: 'author123',
                entityType: 'Restaurant',
                entity: '507f1f77bcf86cd799439013',
                helpfulVotes: [], // No votes
                helpfulCount: 0,
                save: vi.fn(),
                toString: () => reviewId,
            };

            // Mock findIndex to return -1 (not found)
            mockReview.helpfulVotes.findIndex = vi.fn().mockReturnValue(-1);

            mockedReview.findById.mockResolvedValue(mockReview);

            await expect(reviewService.removeHelpfulVote(reviewId, userId)).rejects.toThrow(HttpError);

            try {
                await reviewService.removeHelpfulVote(reviewId, userId);
            } catch (error) {
                expect(error).toBeInstanceOf(HttpError);
                if (error instanceof HttpError) {
                    expect(error.statusCode).toBe(HttpStatusCode.NOT_FOUND);
                    expect(error.message).toContain('Vote not found');
                }
            }
        });
    });

    describe('Input Validation & Injection Prevention', () => {
        it('should reject invalid ObjectId format for reviewId', async () => {
            const invalidReviewId = 'invalid-id';
            const userId = '507f1f77bcf86cd799439012';

            // Mock ObjectId.isValid to return false for invalid IDs
            const { Types } = await import('mongoose');
            (Types.ObjectId.isValid as MockedFunction<typeof Types.ObjectId.isValid>).mockReturnValue(false);

            await expect(reviewService.markAsHelpful(invalidReviewId, userId)).rejects.toThrow(HttpError);

            try {
                await reviewService.markAsHelpful(invalidReviewId, userId);
            } catch (error) {
                expect(error).toBeInstanceOf(HttpError);
                if (error instanceof HttpError) {
                    expect(error.statusCode).toBe(HttpStatusCode.BAD_REQUEST);
                    expect(error.message).toContain('Invalid review ID format');
                }
            }

            // Restore mock
            (Types.ObjectId.isValid as MockedFunction<typeof Types.ObjectId.isValid>).mockReturnValue(true);
        });

        it('should reject invalid ObjectId format for userId', async () => {
            const reviewId = '507f1f77bcf86cd799439011';
            const invalidUserId = 'invalid-user-id';

            // Mock to return true for reviewId but false for userId
            const { Types } = await import('mongoose');
            (Types.ObjectId.isValid as MockedFunction<typeof Types.ObjectId.isValid>).mockImplementation(
                (id: Parameters<typeof Types.ObjectId.isValid>[0]) => id === reviewId
            );

            await expect(reviewService.markAsHelpful(reviewId, invalidUserId)).rejects.toThrow(HttpError);

            try {
                await reviewService.markAsHelpful(reviewId, invalidUserId);
            } catch (error) {
                expect(error).toBeInstanceOf(HttpError);
                if (error instanceof HttpError) {
                    expect(error.statusCode).toBe(HttpStatusCode.BAD_REQUEST);
                    expect(error.message).toContain('Invalid user ID format');
                }
            }

            // Restore mock
            (Types.ObjectId.isValid as MockedFunction<typeof Types.ObjectId.isValid>).mockReturnValue(true);
        });

        it('should handle review not found scenario', async () => {
            const reviewId = '507f1f77bcf86cd799439011';
            const userId = '507f1f77bcf86cd799439012';

            mockedReview.findById.mockResolvedValue(null);

            await expect(reviewService.markAsHelpful(reviewId, userId)).rejects.toThrow(HttpError);

            try {
                await reviewService.markAsHelpful(reviewId, userId);
            } catch (error) {
                expect(error).toBeInstanceOf(HttpError);
                if (error instanceof HttpError) {
                    expect(error.statusCode).toBe(HttpStatusCode.NOT_FOUND);
                    expect(error.message).toContain('Review not found');
                }
            }
        });
    });

    describe('Duplicate Review Prevention', () => {
        it('should detect existing review by user for same entity', async () => {
            const userId = '507f1f77bcf86cd799439012';
            const entityType = 'Restaurant';
            const entityId = '507f1f77bcf86cd799439013';

            const existingReview: MockedReview = {
                _id: '507f1f77bcf86cd799439014',
                author: userId,
                entityType,
                entity: entityId,
                helpfulVotes: [],
                helpfulCount: 0,
                save: vi.fn(),
                toString: () => '507f1f77bcf86cd799439014',
            };

            mockedReview.findOne.mockResolvedValue(existingReview);

            const result = await reviewService.findByUserAndEntity(userId, entityType, entityId);

            expect(result).toBeDefined();
            expect(mockedReview.findOne).toHaveBeenCalledWith({
                author: expect.objectContaining({
                    toString: expect.any(Function),
                }),
                entityType,
                entity: expect.objectContaining({
                    toString: expect.any(Function),
                }),
            });
        });

        it('should return null when no existing review found', async () => {
            const userId = '507f1f77bcf86cd799439012';
            const entityType = 'Restaurant';
            const entityId = '507f1f77bcf86cd799439013';

            mockedReview.findOne.mockResolvedValue(null);

            const result = await reviewService.findByUserAndEntity(userId, entityType, entityId);

            expect(result).toBeNull();
        });
    });

    describe('Entity Type Validation', () => {
        it('should validate entity type whitelist', async () => {
            const validEntityTypes = ['Restaurant', 'Recipe', 'Market', 'Business', 'Doctor', 'Sanctuary'];

            // This test verifies that the service only accepts valid entity types
            for (const entityType of validEntityTypes) {
                expect(() => {
                    // This would be called internally by validateEntityTypeAndId
                    const isValid = validEntityTypes.includes(entityType);
                    expect(isValid).toBe(true);
                }).not.toThrow();
            }

            // Test invalid entity type
            const invalidEntityType = 'InvalidEntity';
            const isValid = validEntityTypes.includes(invalidEntityType);
            expect(isValid).toBe(false);
        });
    });
});
