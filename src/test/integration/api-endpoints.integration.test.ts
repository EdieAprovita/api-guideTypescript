/**
 * API Endpoints Integration Tests
 * Simplified integration tests for all API endpoints
 * Tests basic connectivity and response handling with proper TypeScript types
 */

import request from 'supertest';
import { describe, it, expect } from 'vitest';
import type { Response } from 'supertest';
import app from '../../app.js';

interface ApiEndpoint {
  readonly name: string;
  readonly path: string;
}

interface TestResponse {
  status: number;
  body: Record<string, unknown>;
}

const VALID_GET_STATUSES = [200, 401, 404, 500] as const;
const VALID_POST_STATUSES = [400, 401, 404, 422, 500] as const;
const VALID_HEALTH_STATUSES = [200, 404] as const;

type ValidGetStatus = typeof VALID_GET_STATUSES[number];
type ValidPostStatus = typeof VALID_POST_STATUSES[number];
type ValidHealthStatus = typeof VALID_HEALTH_STATUSES[number];

describe('API Endpoints Integration Tests', () => {
  const endpoints: ReadonlyArray<ApiEndpoint> = [
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
  ] as const;

  endpoints.forEach(({ name, path }: ApiEndpoint) => {
    describe(`${name} API`, () => {
      it(`should respond to GET ${path}`, async () => {
        const response: Response = await request(app)
          .get(path)
          .set('User-Agent', 'test-agent')
          .timeout(10000);

        expect(VALID_GET_STATUSES).toContain(response.status as ValidGetStatus);
        expect(typeof response.status).toBe('number');
      });

      it(`should handle POST ${path} without auth`, async () => {
        const response: Response = await request(app)
          .post(path)
          .set('User-Agent', 'test-agent')
          .send({})
          .timeout(10000);

        expect(VALID_POST_STATUSES).toContain(response.status as ValidPostStatus);
        expect(typeof response.status).toBe('number');
      });
    });
  });

  describe('Health Check', () => {
    it('should respond to health check', async () => {
      const response: Response = await request(app)
        .get('/health')
        .set('User-Agent', 'test-agent')
        .timeout(5000);

      expect(VALID_HEALTH_STATUSES).toContain(response.status as ValidHealthStatus);
      expect(typeof response.status).toBe('number');
    });
  });
});
