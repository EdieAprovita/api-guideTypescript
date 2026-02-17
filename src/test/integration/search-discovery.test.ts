import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import mongoose from 'mongoose';
import { Restaurant } from '../../models/Restaurant.js';
import { Business } from '../../models/Business.js';

describe('Search & Discovery Integration Tests (Phase 4)', () => {
    beforeAll(async () => {
        // Setup test data
        await Restaurant.deleteMany({});
        await Business.deleteMany({});

        await Restaurant.create({
            restaurantName: 'Vegan Delight',
            address: '123 Vegan St',
            location: { type: 'Point', coordinates: [-73.935242, 40.73061] },
            cuisine: ['Vegan', 'Healthy'],
            author: new mongoose.Types.ObjectId(),
        });

        await Business.create({
            name: 'Eco Shop',
            address: '456 Eco Ave',
            location: { type: 'Point', coordinates: [-73.935242, 40.73061] },
            category: 'Retail',
            phoneNumber: '+1234567890',
            author: new mongoose.Types.ObjectId(),
        });
    });

    afterAll(async () => {
        await Restaurant.deleteMany({});
        await Business.deleteMany({});
    });

    describe('Unified Search', () => {
        it('should return results from multiple entities when searching by query', async () => {
            const res = await request(app).get('/api/v1/search?q=Vegan');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.some((r: any) => r.type === 'restaurant')).toBe(true);
        });

        it('should return nearby results from multiple entities', async () => {
            const res = await request(app).get('/api/v1/search?lat=40.73061&lng=-73.935242&radius=1000');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    describe('Nearby Endpoints', () => {
        it('should return nearby restaurants', async () => {
            const res = await request(app).get('/api/v1/restaurants/nearby?lat=40.73061&lng=-73.935242');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
            expect(res.body.data[0].restaurantName).toBe('Vegan Delight');
        });

        it('should return nearby businesses', async () => {
            const res = await request(app).get('/api/v1/businesses/nearby?lat=40.73061&lng=-73.935242');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
            // Business uses namePlace alias in SearchService but model has 'name' which is aliased to 'namePlace'
            expect(res.body.data[0].namePlace).toBe('Eco Shop');
        });
    });

    describe('Search Suggestions', () => {
        it('should return suggestions for a search term', async () => {
            const res = await request(app).get('/api/v1/search/suggestions?q=Veg');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toContain('Vegan');
        });
    });
});
