import request from 'supertest';
jest.mock('../config/db');

// Increase timeout because importing the app with ts-jest can be slow
const TEST_TIMEOUT = 10000;
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
        const res = await request(app).get('/api-docs/');
        expect(res.status).toBe(404);
    });
});
