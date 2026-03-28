import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import searchRoutes from '../../routes/searchRoutes.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/search', searchRoutes);

// Mock rate limiting so it does not interfere with unit tests
vi.mock('express-rate-limit', () => ({
    default: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));

// Mock the search controller — we are testing the validation layer only
vi.mock('../../controllers/SearchController', () => ({
    searchController: {
        unifiedSearch: (_req: Request, res: Response) => res.status(200).json({ success: true }),
        getSuggestions: (_req: Request, res: Response) => res.status(200).json({ success: true }),
        getPopularSearches: (_req: Request, res: Response) => res.status(200).json({ success: true }),
        getSearchAggregations: (_req: Request, res: Response) => res.status(200).json({ success: true }),
        saveSearchQuery: (_req: Request, res: Response) => res.status(200).json({ success: true }),
        searchByResourceType: (_req: Request, res: Response) => res.status(200).json({ success: true }),
    },
}));

vi.mock('../../utils/logger', () => ({
    default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe('Search Routes — Joi validation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── GET /api/search ────────────────────────────────────────────────────────

    describe('GET /api/search (unified search)', () => {
        it('returns 400 for invalid latitude (non-numeric string)', async () => {
            const response = await request(app)
                .get('/api/search')
                .query({ latitude: 'abc', longitude: '10' })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Validation failed');
        });

        it('returns 400 for out-of-range latitude (> 90)', async () => {
            const response = await request(app)
                .get('/api/search')
                .query({ latitude: '999', longitude: '10' })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Validation failed');
        });

        it('returns 200 for a valid search query', async () => {
            const response = await request(app)
                .get('/api/search')
                .query({ q: 'vegan burger', latitude: '40.7128', longitude: '-74.0060' })
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('returns 200 with no query params (all fields optional)', async () => {
            await request(app).get('/api/search').expect(200);
        });
    });

    // ── GET /api/search/:resourceType ─────────────────────────────────────────

    describe('GET /api/search/:resourceType', () => {
        it('returns 400 for an invalid resourceType', async () => {
            const response = await request(app).get('/api/search/invalidtype').expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Validation failed');
        });

        it('returns 200 for a valid resourceType', async () => {
            const response = await request(app).get('/api/search/restaurants').expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    // ── POST /api/search/analytics ────────────────────────────────────────────

    describe('POST /api/search/analytics', () => {
        it('returns 400 when required field "query" is missing', async () => {
            const response = await request(app)
                .post('/api/search/analytics')
                .send({ resourceType: 'restaurants' })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Validation failed');
        });

        it('returns 400 when "query" is an empty string', async () => {
            const response = await request(app).post('/api/search/analytics').send({ query: '' }).expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Validation failed');
        });

        it('returns 400 when resourceType is not a valid enum value', async () => {
            const response = await request(app)
                .post('/api/search/analytics')
                .send({ query: 'vegan', resourceType: 'badtype' })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Validation failed');
        });

        it('returns 200 for a valid analytics body with required field only', async () => {
            const response = await request(app)
                .post('/api/search/analytics')
                .send({ query: 'vegan burger' })
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('returns 200 for a valid analytics body with optional resourceType', async () => {
            const response = await request(app)
                .post('/api/search/analytics')
                .send({ query: 'vegan burger', resourceType: 'restaurants' })
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });
});
