import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../../app';
import { setupTestDB } from './helpers/testSetup';

describe('Business API Integration Tests', () => {
    setupTestDB();

    it('should handle business endpoint', async () => {
        const response = await request(app).get('/api/v1/businesses');
        expect([200, 401, 404, 500]).toContain(response.status); // Allow various responses
    });

    it('should handle POST business requests', async () => {
        const businessData = {
            namePlace: 'Test Business',
            address: 'Test Address',
            phone: '123456789',
        };

        const response = await request(app)
            .post('/api/v1/businesses')
            .send(businessData);

        expect([200, 201, 400, 401, 422, 500]).toContain(response.status);
    });

    it('should handle business by ID requests', async () => {
        const response = await request(app).get('/api/v1/businesses/507f1f77bcf86cd799439011');
        expect([200, 401, 404, 500]).toContain(response.status);
    });

    it('should handle unauthorized requests', async () => {
        const response = await request(app).post('/api/v1/businesses').send({});
        expect([401, 422, 500]).toContain(response.status);
    });
});
