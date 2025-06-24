import request from 'supertest';
import express from 'express';
import {
  configureHelmet,
  enforceHTTPS,
  detectSuspiciousActivity,
  limitRequestSize,
  validateUserAgent,
  addCorrelationId
} from '../../middleware/security';

const app = express();
app.use(express.json());

// Test routes
app.use('/test-helmet', configureHelmet());
app.get('/test-helmet', (req, res) => res.json({ success: true }));

app.use('/test-https', enforceHTTPS);
app.get('/test-https', (req, res) => res.json({ success: true }));

app.use('/test-suspicious', detectSuspiciousActivity);
app.post('/test-suspicious', (req, res) => res.json({ success: true, body: req.body }));

app.use('/test-size', limitRequestSize(100)); // 100 bytes limit
app.post('/test-size', (req, res) => res.json({ success: true }));

app.use('/test-user-agent', validateUserAgent);
app.get('/test-user-agent', (req, res) => res.json({ success: true }));

app.use('/test-correlation', addCorrelationId);
app.get('/test-correlation', (req, res) => res.json({ 
  success: true, 
  correlationId: req.correlationId 
}));

describe('Security Middleware Tests', () => {
  describe('Helmet Security Headers', () => {
    it('should add security headers', async () => {
      const response = await request(app)
        .get('/test-helmet');

      expect(response.status).toBe(200);
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('0');
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('HTTPS Enforcement', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalHosts = process.env.ALLOWED_HOSTS;

    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_HOSTS = 'example.com';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
      process.env.ALLOWED_HOSTS = originalHosts;
    });

    it('should allow HTTPS in production', async () => {
      const response = await request(app)
        .get('/test-https')
        .set('x-forwarded-proto', 'https');

      expect(response.status).toBe(200);
    });

    it('should redirect HTTP to HTTPS in production for allowed host', async () => {
      const response = await request(app)
        .get('/test-https')
        .set('x-forwarded-proto', 'http')
        .set('host', 'example.com');

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('https://example.com/test-https');
    });

    it('should reject request when host is not allowed', async () => {
      const response = await request(app)
        .get('/test-https')
        .set('x-forwarded-proto', 'http')
        .set('host', 'malicious.com');

      expect(response.status).toBe(400);
    });
  });

  describe('Suspicious Activity Detection', () => {
    it('should allow normal requests', async () => {
      const normalData = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello world'
      };

      const response = await request(app)
        .post('/test-suspicious')
        .send(normalData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should block SQL injection attempts', async () => {
      const maliciousData = {
        query: "'; DROP TABLE users; --",
        search: "1' UNION SELECT * FROM passwords"
      };

      const response = await request(app)
        .post('/test-suspicious')
        .send(maliciousData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Suspicious request detected');
    });

    it('should block XSS attempts', async () => {
      const xssData = {
        content: '<script>alert("xss")</script>',
        description: 'javascript:alert("xss")',
        bio: '<img src="x" onerror="alert(1)">'
      };

      const response = await request(app)
        .post('/test-suspicious')
        .send(xssData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should block path traversal attempts', async () => {
      const pathTraversalData = {
        file: '../../../etc/passwd',
        path: '..\\..\\windows\\system32'
      };

      const response = await request(app)
        .post('/test-suspicious')
        .send(pathTraversalData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should block command injection attempts', async () => {
      const commandInjectionData = {
        command: 'ls -la; rm -rf /',
        input: 'test | cat /etc/passwd'
      };

      const response = await request(app)
        .post('/test-suspicious')
        .send(commandInjectionData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Request Size Limiting', () => {
    it('should allow requests under size limit', async () => {
      const smallData = { msg: 'hi' };

      const response = await request(app)
        .post('/test-size')
        .send(smallData);

      expect(response.status).toBe(200);
    });

    it('should block requests over size limit', async () => {
      const largeData = { content: 'a'.repeat(200) }; // Over 100 bytes
      const body = JSON.stringify(largeData);

      const response = await request(app)
        .post('/test-size')
        .set('content-length', String(Buffer.byteLength(body)))
        .send(body);

      expect(response.status).toBe(413);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Request entity too large');
    });
  });

  describe('User-Agent Validation', () => {
    it('should allow requests with valid User-Agent', async () => {
      const response = await request(app)
        .get('/test-user-agent')
        .set('User-Agent', 'Mozilla/5.0 (compatible; TestBot/1.0)');

      expect(response.status).toBe(200);
    });

    it('should block requests without User-Agent', async () => {
      const response = await request(app)
        .get('/test-user-agent')
        .set('User-Agent', '');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('User-Agent header is required');
    });

    it('should block malicious User-Agents', async () => {
      const maliciousAgents = [
        'sqlmap/1.0',
        'nikto/2.1.6',
        'Netsparker',
        'Acunetix'
      ];

      for (const agent of maliciousAgents) {
        const response = await request(app)
          .get('/test-user-agent')
          .set('User-Agent', agent);

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Blocked user agent');
      }
    });
  });

  describe('Correlation ID', () => {
    it('should add correlation ID if not provided', async () => {
      const response = await request(app)
        .get('/test-correlation');

      expect(response.status).toBe(200);
      expect(response.body.correlationId).toBeDefined();
      expect(response.headers['x-correlation-id']).toBeDefined();
      expect(response.body.correlationId).toBe(response.headers['x-correlation-id']);
    });

    it('should use provided correlation ID', async () => {
      const customId = 'custom-correlation-id-123';
      
      const response = await request(app)
        .get('/test-correlation')
        .set('X-Correlation-ID', customId);

      expect(response.status).toBe(200);
      expect(response.body.correlationId).toBe(customId);
      expect(response.headers['x-correlation-id']).toBe(customId);
    });

    it('should use X-Request-ID as fallback', async () => {
      const requestId = 'request-id-456';
      
      const response = await request(app)
        .get('/test-correlation')
        .set('X-Request-ID', requestId);

      expect(response.status).toBe(200);
      expect(response.body.correlationId).toBe(requestId);
      expect(response.headers['x-correlation-id']).toBe(requestId);
    });
  });

  describe('Edge Cases', () => {
    it('should handle nested objects in suspicious activity detection', async () => {
      const nestedMaliciousData = {
        user: {
          profile: {
            bio: '<script>alert("nested xss")</script>'
          }
        }
      };

      const response = await request(app)
        .post('/test-suspicious')
        .send(nestedMaliciousData);

      expect(response.status).toBe(400);
    });

    it('should handle array values in suspicious activity detection', async () => {
      const arrayMaliciousData = {
        tags: ['normal', '<script>alert("xss")</script>', 'another']
      };

      const response = await request(app)
        .post('/test-suspicious')
        .send(arrayMaliciousData);

      expect(response.status).toBe(400);
    });
  });
});