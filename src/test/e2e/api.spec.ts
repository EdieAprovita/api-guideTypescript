import { test, expect } from '@playwright/test';

test.describe('API Health Check', () => {
  test('should respond to health check endpoint', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(body.status).toBe('OK');
  });

  test('should respond to API documentation endpoint', async ({ page }) => {
    await page.goto('/api-docs');
    await expect(page).toHaveTitle(/API Documentation|Swagger/);
  });
});

test.describe('API Authentication', () => {
  test('should return 401 for protected endpoints without token', async ({ request }) => {
    const response = await request.get('/api/auth/profile');
    expect(response.status()).toBe(401);
  });
});
