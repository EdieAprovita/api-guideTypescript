import request from 'supertest';
import app from '../../app';
import { setupTestDB } from './helpers/testSetup';

describe('Professional Profiles API Integration Tests', () => {
    setupTestDB();

    it('should return 200 for GET /api/v1/professionsProfile', async () => {
        const res = await request(app).get('/api/v1/professionsProfile');
        expect(res.status).toBe(200);
    });
});
