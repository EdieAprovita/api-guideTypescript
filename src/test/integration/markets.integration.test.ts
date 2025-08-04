import request from 'supertest';
import app from '../../app';
import { setupTestDB } from './helpers/testSetup';

describe('Markets API Integration Tests', () => {
    setupTestDB();

    it('should return 200 for GET /api/v1/markets', async () => {
        const res = await request(app).get('/api/v1/markets');
        expect(res.status).toBe(200);
    });
});
