import request from 'supertest';
jest.mock('../config/db');

// Increase timeout because importing the app with ts-jest can be slow
const TEST_TIMEOUT = 20000;
jest.setTimeout(TEST_TIMEOUT);

const originalEnv = process.env.NODE_ENV;

afterEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = originalEnv;
});

describe('Swagger route', () => {
    it('serves docs in development', async () => {
        process.env.NODE_ENV = 'development';
        const app = (await import('../app')).default;
        const res = await request(app).get('/api-docs/');
        expect(res.status).toBe(200);
    });

    it('is disabled in production', async () => {
        process.env.NODE_ENV = 'production';
        const app = (await import('../app')).default;
        const res = await request(app).get('/api-docs/').set('x-forwarded-proto', 'https'); // Set HTTPS to avoid redirect

        // Should be 404 (not found) or 302 (redirect to HTTPS)
        expect([302, 404]).toContain(res.status);
    });
});
