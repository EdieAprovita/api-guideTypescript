import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';

describe('Cache Middleware Integration Tests', () => {
  it('should work with basic Express app', async () => {
    const app = express();
    app.use(express.json());

    // Import the middleware (which is mocked globally)
    const { cacheMiddleware, restaurantCacheMiddleware, businessCacheMiddleware } = await import('../../middleware/cache');
    
    // Test that middleware functions are available
    expect(typeof cacheMiddleware).toBe('function');
    expect(typeof restaurantCacheMiddleware).toBe('function');
    expect(typeof businessCacheMiddleware).toBe('function');

    // Setup simple routes
    app.get('/restaurants', restaurantCacheMiddleware(), (_req, res) => {
      res.json({ data: [{ id: '1', name: 'Test Restaurant' }] });
    });

    app.get('/business', businessCacheMiddleware(), (_req, res) => {
      res.json({ data: [{ id: '1', name: 'Test Business' }] });
    });

    app.get('/cached/:id', cacheMiddleware('default', { ttl: 300 }), (req, res) => {
      res.json({ data: { id: req.params.id, name: 'Test Item' } });
    });

    // Test the routes work
    const restaurantResponse = await request(app).get('/restaurants');
    expect(restaurantResponse.status).toBe(200);
    expect(restaurantResponse.body.data).toHaveLength(1);

    const businessResponse = await request(app).get('/business');
    expect(businessResponse.status).toBe(200);
    expect(businessResponse.body.data).toHaveLength(1);

    const cachedResponse = await request(app).get('/cached/123');
    expect(cachedResponse.status).toBe(200);
    expect(cachedResponse.body.data.id).toBe('123');
  });

  it('should handle POST requests without caching', async () => {
    const app = express();
    app.use(express.json());

    const { cacheMiddleware } = await import('../../middleware/cache');
    
    app.post('/no-cache', cacheMiddleware(), (_req, res) => {
      res.json({ success: true });
    });

    const response = await request(app).post('/no-cache').send({ test: 'data' });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    const app = express();
    app.use(express.json());

    const { cacheMiddleware } = await import('../../middleware/cache');
    
    app.get('/error-route', cacheMiddleware(), (_req, res) => {
      res.status(500).json({ error: 'Internal Server Error' });
    });

    const response = await request(app).get('/error-route');
    expect(response.status).toBe(500);
  });
});