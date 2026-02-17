import { test, expect } from '@playwright/test';

const checkSuccessResponse = async (response: any) => {
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
    return body.data;
};

test.describe('Smoke Tests - Backend Foundation', () => {
    test('Health check should return success structure', async ({ request }) => {
        const response = await request.get('/health');
        const data = await checkSuccessResponse(response);
        expect(data).toHaveProperty('status', 'alive');
    });

    test('Root endpoint should return success structure', async ({ request }) => {
        const response = await request.get('/');
        const data = await checkSuccessResponse(response);
        expect(data).toHaveProperty('message', 'Vegan Guide API');
    });

    test('API v1 base endpoint should return success structure', async ({ request }) => {
        const response = await request.get('/api/v1');
        const data = await checkSuccessResponse(response);
        expect(data).toBe('API is running');
    });
});
