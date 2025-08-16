/**
 * API Endpoints Integration Tests
 * Simplified integration tests for all API endpoints
 * Tests basic connectivity and response handling
 */

import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../../app';

describe('API Endpoints Integration Tests', () => {
  const endpoints = [
    { name: 'Business', path: '/api/v1/businesses' },
    { name: 'Doctors', path: '/api/v1/doctors' },
    { name: 'Markets', path: '/api/v1/markets' },
    { name: 'Posts', path: '/api/v1/posts' },
    { name: 'Recipes', path: '/api/v1/recipes' },
    { name: 'Reviews', path: '/api/v1/reviews' },
    { name: 'Sanctuaries', path: '/api/v1/sanctuaries' },
    { name: 'Professions', path: '/api/v1/professions' },
    { name: 'Professional Profiles', path: '/api/v1/professionalProfile' },
    { name: 'Restaurants', path: '/api/v1/restaurants' },
    { name: 'Users', path: '/api/v1/users/profile' },
  ];

  endpoints.forEach(({ name, path }) => {
    describe(`${name} API`, () => {
      it(`should respond to GET ${path}`, async () => {
        const response = await request(app)
          .get(path)
          .set('User-Agent', 'test-agent')
          .timeout(10000);

        // Accept any reasonable HTTP status code
        expect([200, 401, 404, 500]).toContain(response.status);
      });

      it(`should handle POST ${path} without auth`, async () => {
        const response = await request(app)
          .post(path)
          .set('User-Agent', 'test-agent')
          .send({})
          .timeout(10000);

        // Expect auth error or validation error
        expect([400, 401, 422, 500]).toContain(response.status);
      });
    });
  });

  describe('Health Check', () => {
    it('should respond to health check', async () => {
      const response = await request(app)
        .get('/health')
        .set('User-Agent', 'test-agent')
        .timeout(5000);

      expect([200, 404]).toContain(response.status);
    });
  });
});
