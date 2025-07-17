import request from 'supertest';
import app from '../../app';
import { setupTestDB } from './helpers/testSetup';

describe('Sanctuaries API Integration Tests', () => {
    setupTestDB();

    it('should return 200 for GET /api/v1/sanctuaries', async () => {
        const res = await request(app).get('/api/v1/sanctuaries');
        expect(res.status).toBe(200);
    });
});
