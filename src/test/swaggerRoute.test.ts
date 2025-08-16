import { vi, describe, it, expect } from 'vitest';
import request from 'supertest';

vi.mock('../config/db');

// Simple test - just verify swagger loads in development
describe('Swagger route', () => {
    it('serves docs in development', async () => {
        process.env.NODE_ENV = 'development';
        const app = (await import('../app')).default;
        const res = await request(app)
            .get('/api-docs/')
            .set('User-Agent', 'Mozilla/5.0 (Test Browser)')
            .set('Host', 'localhost:5000');
        expect(res.status).toBe(200);
    });
});
