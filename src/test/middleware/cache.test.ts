import { vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { cacheMiddleware } from '../../middleware/cache';
import { cacheService } from '../../services/CacheService';

// Mock the cache service
vi.mock('../../services/CacheService', () => ({
  cacheService: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getStats: vi.fn(),
  }
}));

const app = express();
app.use(express.json());

// Setup test routes
app.get('/cached-route/:id', cacheMiddleware('default', { ttl: 300 }), (req, res) => {
  res.json({ 
    data: { 
      id: req.params.id, 
      name: 'Test Item',
      timestamp: new Date().toISOString() 
    } 
  });
});

app.get('/custom-ttl/:id', cacheMiddleware('default', { ttl: 600 }), (req, res) => {
  res.json({ data: { id: req.params.id } });
});

app.post('/invalidate/:id', (req, res) => {
  res.json({ success: true, id: req.params.id });
});

// Route with custom key generator
app.get('/custom-key/:category/:id', 
  cacheMiddleware('default', { 
    ttl: 300,
    keyGenerator: (req) => `custom:${req.params.category}:${req.params.id}`
  }), 
  (req, res) => {
    res.json({ 
      category: req.params.category, 
      id: req.params.id 
    });
  }
);

describe('Cache Middleware Tests', () => {
  const mockedCacheService = cacheService as Mocked<typeof cacheService>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Cache Hit Scenarios', () => {
    it('should return cached data when cache hit occurs', async () => {
      const cachedData = { 
        data: { 
          id: '123', 
          name: 'Cached Item' 
        } 
      };
      
      mockedCacheService.get.mockResolvedValueOnce(JSON.stringify(cachedData));

      const response = await request(app).get('/cached-route/123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(cachedData);
      expect(mockedCacheService.get).toHaveBeenCalledWith('GET:/cached-route/123');
      expect(mockedCacheService.set).not.toHaveBeenCalled();
    });

    it('should handle different cache keys correctly', async () => {
      mockedCacheService.get.mockResolvedValueOnce(null);

      await request(app).get('/cached-route/456');

      expect(mockedCacheService.get).toHaveBeenCalledWith('GET:/cached-route/456');
    });
  });

  describe('Cache Miss Scenarios', () => {
    it('should call route handler and cache response on cache miss', async () => {
      mockedCacheService.get.mockResolvedValueOnce(null);
      mockedCacheService.set.mockResolvedValueOnce();

      const response = await request(app).get('/cached-route/789');

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe('789');
      expect(mockedCacheService.get).toHaveBeenCalled();
      expect(mockedCacheService.set).toHaveBeenCalledWith(
        'GET:/cached-route/789',
        expect.objectContaining({
          data: expect.objectContaining({
            id: '789'
          })
        }),
        'default',
        expect.objectContaining({
          ttl: 300
        })
      );
    });

    it('should use custom TTL when specified', async () => {
      mockedCacheService.get.mockResolvedValueOnce(null);
      mockedCacheService.set.mockResolvedValueOnce();

      await request(app).get('/custom-ttl/999');

      expect(mockedCacheService.set).toHaveBeenCalledWith(
        'GET:/custom-ttl/999',
        expect.objectContaining({
          data: expect.objectContaining({
            id: '999'
          })
        }),
        'default',
        expect.objectContaining({
          ttl: 600
        })
      );
    });
  });

  describe('Cache Key Generation', () => {
    it('should use custom key generator when provided', async () => {
      mockedCacheService.get.mockResolvedValueOnce(null);
      mockedCacheService.set.mockResolvedValueOnce();

      await request(app).get('/custom-key/products/123');

      expect(mockedCacheService.get).toHaveBeenCalledWith('custom:products:123');
      expect(mockedCacheService.set).toHaveBeenCalledWith(
        'custom:products:123',
        expect.objectContaining({
          category: 'products',
          id: '123'
        }),
        'default',
        expect.objectContaining({
          ttl: 300
        })
      );
    });

    it('should handle query parameters in cache key', async () => {
      mockedCacheService.get.mockResolvedValueOnce(null);

      await request(app).get('/cached-route/123?sort=name&filter=active');

      expect(mockedCacheService.get).toHaveBeenCalledWith(
        'GET:/cached-route/123?filter=active&sort=name'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle cache service errors gracefully', async () => {
      mockedCacheService.get.mockRejectedValueOnce(new Error('Redis connection failed'));

      const response = await request(app).get('/cached-route/error-test');

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe('error-test');
    });

    it('should handle invalid cached data', async () => {
      mockedCacheService.get.mockResolvedValueOnce('invalid json');

      const response = await request(app).get('/cached-route/invalid');

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe('invalid');
    });

    it('should handle cache set errors', async () => {
      mockedCacheService.get.mockResolvedValueOnce(null);
      mockedCacheService.set.mockRejectedValueOnce(new Error('Cache set failed'));

      const response = await request(app).get('/cached-route/set-error');

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe('set-error');
    });
  });

  describe('Cache Invalidation', () => {
    it('should not cache POST requests', async () => {
      const response = await request(app)
        .post('/invalidate/123')
        .send({ data: 'test' });

      expect(response.status).toBe(200);
      expect(mockedCacheService.get).not.toHaveBeenCalled();
      expect(mockedCacheService.set).not.toHaveBeenCalled();
    });

    it('should handle different HTTP methods correctly', async () => {
      // GET should use cache
      mockedCacheService.get.mockResolvedValueOnce(null);
      await request(app).get('/cached-route/methods');
      expect(mockedCacheService.get).toHaveBeenCalled();

      vi.clearAllMocks();

      // POST should not use cache
      await request(app).post('/invalidate/methods');
      expect(mockedCacheService.get).not.toHaveBeenCalled();
    });
  });



  describe('Edge Cases', () => {
    it('should handle empty responses', async () => {
      mockedCacheService.get.mockResolvedValueOnce(null);
      
      app.get('/empty-response', cacheMiddleware('default', { ttl: 300 }), (_req, res) => {
        res.json({});
      });

      const response = await request(app).get('/empty-response');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({});
    });

    it('should handle non-JSON responses', async () => {
      mockedCacheService.get.mockResolvedValueOnce(null);
      
      app.get('/text-response', cacheMiddleware('default', { ttl: 300 }), (_req, res) => {
        res.send('Plain text response');
      });

      const response = await request(app).get('/text-response');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Plain text response');
    });

    it('should handle responses with status codes other than 200', async () => {
      mockedCacheService.get.mockResolvedValueOnce(null);
      
      app.get('/not-found', cacheMiddleware('default', { ttl: 300 }), (_req, res) => {
        res.status(404).json({ error: 'Not found' });
      });

      const response = await request(app).get('/not-found');
      expect(response.status).toBe(404);
      // Should not cache error responses
      expect(mockedCacheService.set).not.toHaveBeenCalled();
    });
  });
});