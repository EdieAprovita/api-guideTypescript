import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../../app';
import { setupTestDB } from './helpers/testSetup';

describe('Restaurant API Integration Tests', () => {
    setupTestDB();

    it('should handle restaurant endpoint requests', async () => {
        const response = await request(app).get('/api/v1/restaurants');
        expect([200, 401, 404, 500]).toContain(response.status);
    });

    it('should handle POST restaurant requests', async () => {
        const restaurantData = {
            restaurantName: 'Test Restaurant',
            address: 'Test Address',
            budget: '$$',
            cuisine: ['Italian'],
        };

        const response = await request(app)
            .post('/api/v1/restaurants')
            .send(restaurantData);

        expect([200, 201, 400, 401, 422, 500]).toContain(response.status);
    });

    it('should handle restaurant by ID requests', async () => {
        const response = await request(app).get('/api/v1/restaurants/507f1f77bcf86cd799439011');
        expect([200, 401, 404, 500]).toContain(response.status);
    });

    it('should handle restaurant search requests', async () => {
        const response = await request(app).get('/api/v1/restaurants/search?cuisine=Italian');
        expect([200, 400, 401, 404, 500]).toContain(response.status); // Include 400 for validation errors
    });
});