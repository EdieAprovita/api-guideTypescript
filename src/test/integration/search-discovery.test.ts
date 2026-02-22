import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import mongoose from 'mongoose';
import { Restaurant } from '../../models/Restaurant.js';
import { Business } from '../../models/Business.js';

describe('Search & Discovery Integration Tests (Phase 4)', () => {
    beforeEach(async () => {
        // Setup test data (DB is cleared by global beforeEach in integration-setup)
        await Restaurant.create({
            restaurantName: 'Vegan Delight',
            address: '123 Vegan St',
            location: { type: 'Point', coordinates: [-73.935242, 40.73061] },
            cuisine: ['Vegan', 'Healthy'],
            author: new mongoose.Types.ObjectId(),
        });

        await Business.create({
            namePlace: 'Eco Shop',
            address: '456 Eco Ave',
            location: { type: 'Point', coordinates: [-73.935242, 40.73061] },
            typeBusiness: 'Retail',
            image: 'http://example.com/image.jpg',
            budget: 2,
            hours: [],
            author: new mongoose.Types.ObjectId(),
        });
    });

    describe('Unified Search', () => {
        it('should return results from multiple entities when searching by query', async () => {
            const res = await request(app).get('/api/v1/search?q=Vegan');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.some((r: any) => r.type === 'restaurant')).toBe(true);
        });

        it('should return nearby results from multiple entities', async () => {
            const res = await request(app).get('/api/v1/search?latitude=40.73061&longitude=-73.935242&radius=1000');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    describe('Nearby Endpoints', () => {
        it('should return nearby restaurants', async () => {
            const res = await request(app).get('/api/v1/restaurants/nearby?latitude=40.73061&longitude=-73.935242');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
            expect(res.body.data[0].restaurantName).toBe('Vegan Delight');
        });

        it('should return nearby businesses', async () => {
            const res = await request(app).get('/api/v1/businesses/nearby?latitude=40.73061&longitude=-73.935242');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
            expect(res.body.data[0].namePlace).toBe('Eco Shop');
        });
    });

    describe('Search Suggestions', () => {
        it('should return suggestions for a search term', async () => {
            const res = await request(app).get('/api/v1/search/suggestions?q=Veg');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toContain('Vegan Delight'); // Updated to full restaurantName
        });
    });

    describe('New Search Endpoints', () => {
        it('should return popular searches', async () => {
            const res = await request(app).get('/api/v1/search/popular');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should return aggregations', async () => {
            const res = await request(app).get('/api/v1/search/aggregations');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('restaurants');
            expect(res.body.data.restaurants).toBeDefined();
        });

        it('should log analytics query', async () => {
            const res = await request(app)
                .post('/api/v1/search/analytics')
                .send({ query: 'test query', resourceType: 'restaurant' });
            expect(res.status).toBe(202);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Search query logged');
        });

        it('should return 400 for empty analytics query', async () => {
            const res = await request(app).post('/api/v1/search/analytics').send({ query: '   ' });
            expect(res.status).toBe(400);
        });

        it('should search by specific resource type', async () => {
            const res = await request(app).get('/api/v1/search/restaurant?q=Vegan');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.type).toBe('restaurant');
        });

        it('should return 400 for unknown resource type', async () => {
            const res = await request(app).get('/api/v1/search/unknown');
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });
});
