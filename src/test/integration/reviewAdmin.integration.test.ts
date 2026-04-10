import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

// -----------------------------------------------------------------------
// Mocks must be declared before any import that transitively loads them.
// -----------------------------------------------------------------------

vi.mock('../../middleware/authMiddleware.js', () => ({
    protect: vi.fn((req: any, _res: any, next: any) => {
        const auth = req.headers.authorization as string | undefined;
        if (!auth?.startsWith('Bearer ')) {
            return _res.status(401).json({ success: false, message: 'Not authorized to access this route' });
        }
        const token = auth.split(' ')[1];
        if (token === 'valid-admin-token') {
            req.user = { _id: 'admin-user-id', email: 'admin@test.com', role: 'admin', isActive: true };
        } else if (token === 'valid-user-token') {
            req.user = { _id: 'normal-user-id', email: 'user@test.com', role: 'user', isActive: true };
        } else {
            return _res.status(401).json({ success: false, message: 'Invalid or expired token' });
        }
        return next();
    }),
    admin: vi.fn((req: any, res: any, next: any) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Forbidden', error: 'Admin access required' });
        }
        return next();
    }),
    requireAuth: vi.fn((_req: any, _res: any, next: any) => next()),
    professional: vi.fn((_req: any, _res: any, next: any) => next()),
    checkOwnership: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    logout: vi.fn(async (_req: any, _res: any, next: any) => next()),
    refreshToken: vi.fn(async (_req: any, res: any) => {
        res.json({ success: true, data: { accessToken: 'new-access-token' } });
    }),
    revokeAllTokens: vi.fn(async (_req: any, res: any) => {
        res.json({ success: true, message: 'All tokens revoked successfully' });
    }),
}));

vi.mock('../../services/ReviewService.js', () => ({
    reviewService: {
        findAllReviews: vi.fn().mockResolvedValue({
            data: [],
            pagination: {
                currentPage: 1,
                totalPages: 1,
                totalItems: 0,
                itemsPerPage: 20,
                hasNextPage: false,
                hasPrevPage: false,
            },
        }),
        getReviewsByEntity: vi.fn().mockResolvedValue({ data: [], pagination: {} }),
        getReviewById: vi.fn().mockResolvedValue(null),
        addReview: vi.fn().mockResolvedValue({}),
        updateReview: vi.fn().mockResolvedValue({}),
        deleteReview: vi.fn().mockResolvedValue(undefined),
        markAsHelpful: vi.fn().mockResolvedValue({}),
        removeHelpfulVote: vi.fn().mockResolvedValue({}),
        findByUserAndEntity: vi.fn().mockResolvedValue(null),
        getReviewStats: vi.fn().mockResolvedValue({}),
        getTopRatedReviews: vi.fn().mockResolvedValue([]),
        listReviewsForModel: vi.fn().mockResolvedValue([]),
    },
}));

vi.mock('../../services/RestaurantService.js', () => ({
    restaurantService: {
        findById: vi.fn().mockResolvedValue(null),
        searchPaginated: vi.fn().mockResolvedValue({ data: [], pagination: {} }),
        findNearbyPaginated: vi.fn().mockResolvedValue({ data: [], pagination: {} }),
        countAll: vi.fn().mockResolvedValue(0),
        getAll: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
        updateById: vi.fn().mockResolvedValue({}),
        deleteById: vi.fn().mockResolvedValue(undefined),
    },
}));

// Import app after mocks are declared
import app from '../../app.js';
import { reviewService } from '../../services/ReviewService.js';

// -----------------------------------------------------------------------

const ADMIN_TOKEN = 'valid-admin-token';
const USER_TOKEN = 'valid-user-token';

const makeRequest = (path: string, token?: string) => {
    const req = request(app).get(path).set('User-Agent', 'test-agent').set('API-Version', 'v1');

    if (token) {
        req.set('Authorization', `Bearer ${token}`);
    }

    return req;
};

describe('GET /api/v1/reviews — admin list all reviews', () => {
    const ENDPOINT = '/api/v1/reviews';

    describe('Authentication & Authorization', () => {
        it('should return 401 when no auth token is provided', async () => {
            const res = await makeRequest(ENDPOINT);
            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should return 403 when authenticated as a regular user', async () => {
            const res = await makeRequest(ENDPOINT, USER_TOKEN);
            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Admin access required');
        });

        it('should return 200 when authenticated as an admin', async () => {
            const res = await makeRequest(ENDPOINT, ADMIN_TOKEN);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('Response shape', () => {
        it('should return { success, data, pagination } on success', async () => {
            const res = await makeRequest(ENDPOINT, ADMIN_TOKEN);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('pagination');
            expect(Array.isArray(res.body.data)).toBe(true);

            const { pagination } = res.body;
            expect(pagination).toHaveProperty('currentPage');
            expect(pagination).toHaveProperty('totalPages');
            expect(pagination).toHaveProperty('totalItems');
            expect(pagination).toHaveProperty('itemsPerPage');
            expect(pagination).toHaveProperty('hasNextPage');
            expect(pagination).toHaveProperty('hasPrevPage');
        });
    });

    describe('Filtering — resourceType', () => {
        it('should call findAllReviews with correct resourceType when provided', async () => {
            const findAllMock = vi.mocked(reviewService.findAllReviews);
            findAllMock.mockClear();

            await makeRequest(`${ENDPOINT}?resourceType=restaurant`, ADMIN_TOKEN);

            expect(findAllMock).toHaveBeenCalledOnce();
            const callArgs = findAllMock.mock.calls[0]![0];
            expect(callArgs.resourceType).toBe('restaurant');
        });

        it('should return 400 for an invalid resourceType value', async () => {
            const res = await makeRequest(`${ENDPOINT}?resourceType=invalidType`, ADMIN_TOKEN);
            expect(res.status).toBe(400);
        });
    });

    describe('Pagination defaults', () => {
        it('should default to page=1 and limit=20 when not specified', async () => {
            const findAllMock = vi.mocked(reviewService.findAllReviews);
            findAllMock.mockClear();

            await makeRequest(ENDPOINT, ADMIN_TOKEN);

            const callArgs = findAllMock.mock.calls[0]![0];
            expect(callArgs.page).toBe(1);
            expect(callArgs.limit).toBe(20);
        });
    });

    describe('Query validation — bad inputs', () => {
        it('should return 400 when limit is non-numeric', async () => {
            const res = await makeRequest(`${ENDPOINT}?limit=abc`, ADMIN_TOKEN);
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should return 400 when limit exceeds the maximum of 50', async () => {
            const res = await makeRequest(`${ENDPOINT}?limit=51`, ADMIN_TOKEN);
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should return 400 when minRating is out of range (0)', async () => {
            const res = await makeRequest(`${ENDPOINT}?minRating=0`, ADMIN_TOKEN);
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should return 400 when sortBy has an unknown value', async () => {
            const res = await makeRequest(`${ENDPOINT}?sortBy=unknown`, ADMIN_TOKEN);
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe('Valid optional filters', () => {
        it('should forward minRating to the service', async () => {
            const findAllMock = vi.mocked(reviewService.findAllReviews);
            findAllMock.mockClear();

            await makeRequest(`${ENDPOINT}?minRating=4`, ADMIN_TOKEN);

            const callArgs = findAllMock.mock.calls[0]![0];
            expect(callArgs.minRating).toBe(4);
        });

        it('should forward sortBy to the service', async () => {
            const findAllMock = vi.mocked(reviewService.findAllReviews);
            findAllMock.mockClear();

            await makeRequest(`${ENDPOINT}?sortBy=rating`, ADMIN_TOKEN);

            const callArgs = findAllMock.mock.calls[0]![0];
            expect(callArgs.sortBy).toBe('rating');
        });

        it('should forward search to the service', async () => {
            const findAllMock = vi.mocked(reviewService.findAllReviews);
            findAllMock.mockClear();

            await makeRequest(`${ENDPOINT}?search=delicious`, ADMIN_TOKEN);

            const callArgs = findAllMock.mock.calls[0]![0];
            expect(callArgs.search).toBe('delicious');
        });
    });
});
