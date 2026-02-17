import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Backend Foundation', () => {
    test('Health check should return success structure', async ({ request }) => {
        const response = await request.get('/health');
        expect(response.ok()).toBeTruthy();
        const body = await response.json();

        // Response wrapper should wrap it in { success, data }
        expect(body).toHaveProperty('success', true);
        expect(body).toHaveProperty('data');
        expect(body.data).toHaveProperty('status', 'alive');
    });

    test('Root endpoint should return success structure', async ({ request }) => {
        const response = await request.get('/');
        expect(response.ok()).toBeTruthy();
        const body = await response.json();

        expect(body).toHaveProperty('success', true);
        expect(body).toHaveProperty('data');
        expect(body.data).toHaveProperty('message', 'Vegan Guide API');
    });

    test('API v1 base endpoint should return success structure', async ({ request }) => {
        const response = await request.get('/api/v1');
        expect(response.ok()).toBeTruthy();
        const body = await response.json();

        // Note: res.send("API is running") might be wrapped as { success, data: "API is running" }
        expect(body).toHaveProperty('success', true);
        expect(body).toHaveProperty('data', 'API is running');
    });
});
