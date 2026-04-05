import { vi, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';

// Define types for middleware functions
interface MockRequest {
    user?: { _id: string; role: string };
}

interface MockResponse {
    json: (data: Record<string, unknown>) => void;
}

type NextFunction = () => void;

// Mock all external dependencies
vi.mock('../../middleware/authMiddleware.js', () => ({
    protect: (req: MockRequest, _res: MockResponse, next: NextFunction) => {
        // Simple mock that always passes through
        req.user = { _id: 'test-user-id', role: 'user' };
        next();
    },
    admin: (_req: MockRequest, _res: MockResponse, next: NextFunction) => next(),
    professional: (_req: MockRequest, _res: MockResponse, next: NextFunction) => next(),
    requireAuth: (_req: MockRequest, _res: MockResponse, next: NextFunction) => next(),
    checkOwnership: () => (_req: MockRequest, _res: MockResponse, next: NextFunction) => next(),
    logout: async (_req: MockRequest, res: MockResponse) => {
        res.json({ success: true, message: 'Logged out successfully' });
    },
    refreshToken: async (_req: MockRequest, res: MockResponse) => {
        res.json({
            success: true,
            message: 'Tokens refreshed successfully',
            data: { accessToken: 'new-access-token', refreshToken: 'new-refresh-token' },
        });
    },
    revokeAllTokens: async (_req: MockRequest, res: MockResponse) => {
        res.json({ success: true, message: 'All tokens revoked successfully' });
    },
}));

// Mock the database services
vi.mock('../../services/RestaurantService.js', () => ({
    restaurantService: {
        findById: vi.fn().mockResolvedValue({
            _id: 'test-restaurant-id',
            restaurantName: 'Test Restaurant',
            description: 'Test Description',
        }),
        searchPaginated: vi.fn().mockResolvedValue({ data: [], pagination: {} }),
        findNearbyPaginated: vi.fn().mockResolvedValue({ data: [], pagination: {} }),
        countAll: vi.fn().mockResolvedValue(0),
        getAll: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ _id: 'test-restaurant-id' }),
        updateById: vi.fn().mockResolvedValue({ _id: 'test-restaurant-id' }),
        deleteById: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('../../services/ReviewService.js', () => ({
    reviewService: {
        addReview: vi.fn().mockResolvedValue({
            _id: 'test-review-id',
            title: 'Test Review',
            content: 'Test Content',
            rating: 5,
            author: 'test-user-id',
            restaurant: 'test-restaurant-id',
        }),
        findByUserAndEntity: vi.fn().mockResolvedValue(null),
        getReviewsByEntity: vi.fn().mockResolvedValue({ data: [], pagination: {} }),
        getReviewStats: vi.fn().mockResolvedValue({}),
        getReviewById: vi.fn().mockResolvedValue({
            _id: '507f1f77bcf86cd799439011',
            title: 'Test Review',
            content: 'Test Content',
            rating: 5,
        }),
        updateReview: vi.fn().mockResolvedValue({}),
        deleteReview: vi.fn().mockResolvedValue(undefined),
        markAsHelpful: vi.fn().mockResolvedValue({}),
        removeHelpfulVote: vi.fn().mockResolvedValue({}),
        findAllReviews: vi.fn().mockResolvedValue({ data: [], pagination: {} }),
        listReviewsForModel: vi.fn().mockResolvedValue([]),
        getTopRatedReviews: vi.fn().mockResolvedValue([]),
    },
}));

// Import app after mocks are declared
import app from '../../app.js';
import { reviewService } from '../../services/ReviewService.js';

// -----------------------------------------------------------------------

const EXISTING_REVIEW_ID = '507f1f77bcf86cd799439011';
const NON_EXISTENT_REVIEW_ID = '507f1f77bcf86cd799439099';

describe('GET /api/v1/reviews/:id', () => {
    const ENDPOINT = '/api/v1/reviews';

    beforeEach(() => {
        vi.mocked(reviewService.getReviewById).mockResolvedValue({
            _id: EXISTING_REVIEW_ID,
            title: 'Test Review',
            content: 'Test Content',
            rating: 5,
        } as never);
    });

    it('should return 200 with review payload for an existing review', async () => {
        const res = await request(app).get(`${ENDPOINT}/${EXISTING_REVIEW_ID}`).set('User-Agent', 'test-agent');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('_id', EXISTING_REVIEW_ID);
        expect(vi.mocked(reviewService.getReviewById)).toHaveBeenCalledWith(EXISTING_REVIEW_ID);
    });

    it('should return 404 for a non-existent valid ObjectId', async () => {
        const { HttpError, HttpStatusCode } = await import('../../types/Errors.js');
        vi.mocked(reviewService.getReviewById).mockRejectedValueOnce(
            new HttpError(HttpStatusCode.NOT_FOUND, 'Review not found')
        );

        const res = await request(app).get(`${ENDPOINT}/${NON_EXISTENT_REVIEW_ID}`).set('User-Agent', 'test-agent');

        expect(res.status).toBe(404);
    });
});

describe('Review Service Tests - Unit Tests', () => {
    const testRestaurantId = 'test-restaurant-id';
    const validReviewData = {
        title: 'Amazing vegan restaurant!',
        content: 'The food was absolutely delicious.',
        rating: 5,
        recommendedDishes: ['Vegan Burger', 'Quinoa Salad'],
    };

    describe('Service Mock Tests', () => {
        it('should have restaurant service mocked correctly', async () => {
            const { restaurantService } = await import('../../services/RestaurantService');

            const restaurant = await restaurantService.findById(testRestaurantId);
            expect(restaurant).toBeDefined();
            expect(restaurant._id).toBe(testRestaurantId);
            expect(restaurant.restaurantName).toBe('Test Restaurant');
        });

        it('should have review service mocked correctly', async () => {
            const { reviewService } = await import('../../services/ReviewService');

            const review = await reviewService.addReview(validReviewData);
            expect(review).toBeDefined();
            expect(review._id).toBe('test-review-id');
            expect(review.title).toBe('Test Review');
        });
    });

    describe('Auth Middleware Mock Tests', () => {
        it('should have auth middleware mocked correctly', async () => {
            const { protect } = await import('../../middleware/authMiddleware');

            const req: MockRequest = {};
            const res: MockResponse = { json: vi.fn() };
            const next = vi.fn();

            protect(req, res, next);

            expect(req.user).toBeDefined();
            expect(req.user?._id).toBe('test-user-id');
            expect(req.user?.role).toBe('user');
            expect(next).toHaveBeenCalled();
        });
    });

    describe('Data Validation Tests', () => {
        it('should validate review data structure', () => {
            expect(validReviewData).toHaveProperty('title');
            expect(validReviewData).toHaveProperty('content');
            expect(validReviewData).toHaveProperty('rating');
            expect(validReviewData).toHaveProperty('recommendedDishes');

            expect(typeof validReviewData.title).toBe('string');
            expect(typeof validReviewData.content).toBe('string');
            expect(typeof validReviewData.rating).toBe('number');
            expect(Array.isArray(validReviewData.recommendedDishes)).toBe(true);
        });

        it('should have valid restaurant ID format', () => {
            expect(testRestaurantId).toBeDefined();
            expect(typeof testRestaurantId).toBe('string');
            expect(testRestaurantId.length).toBeGreaterThan(0);
        });
    });
});
