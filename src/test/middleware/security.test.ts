// Security Middleware Test - Uses isolated setup to test actual security middleware functionality
// This test uses real security middleware without global mocks interfering

import request from 'supertest';
import express from 'express';
import {
    configureHelmet,
    enforceHTTPS,
    detectSuspiciousActivity,
    limitRequestSize,
    validateUserAgent,
    addCorrelationId,
} from '../../middleware/security';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
    createMockRequest,
    createMockResponse,
    createMockNext,
    type MockRequest,
    type MockResponse,
} from './security-test-helpers';

const app = express();
app.use(express.json());

// Test routes
app.use('/test-helmet', configureHelmet());
app.get('/test-helmet', (req, res) => res.json({ success: true }));

app.use('/test-https', enforceHTTPS);
app.get('/test-https', (req, res) => res.json({ success: true }));

app.use('/test-suspicious', detectSuspiciousActivity);
app.post('/test-suspicious', (req, res) => res.json({ success: true, body: req.body }));

// Size limiting middleware (before body parsing)
app.use('/test-size', limitRequestSize(100)); // 100 bytes limit
app.post('/test-size', (req, res) => res.json({ success: true }));

app.use('/test-user-agent', validateUserAgent);
app.get('/test-user-agent', (req, res) => res.json({ success: true }));

app.use('/test-correlation', addCorrelationId);
app.get('/test-correlation', (req, res) =>
    res.json({
        success: true,
        correlationId: req.correlationId,
    })
);

describe('Security Middleware Tests', () => {
    describe('Helmet Security Headers', () => {
        it('should add security headers', async () => {
            const response = await request(app).get('/test-helmet');

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
        it('should allow HTTPS in production', async () => {
            process.env.NODE_ENV = 'production';

            const response = await request(app).get('/test-https').set('x-forwarded-proto', 'https');

            expect(response.status).toBe(200);
        });

        it('should redirect HTTP to HTTPS in production', async () => {
            process.env.NODE_ENV = 'production';

            const response = await request(app)
                .get('/test-https')
                .set('x-forwarded-proto', 'http')
                .set('host', 'example.com');

            expect(response.status).toBe(302);
            expect(response.headers.location).toBe('https://example.com/test-https');

            process.env.NODE_ENV = 'test'; // Reset
        });
    });

    describe('Suspicious Activity Detection', () => {
        it('should allow normal requests', async () => {
            const normalData = {
                name: 'John Doe',
                email: 'john@example.com',
                message: 'Hello world',
            };

            const response = await request(app).post('/test-suspicious').send(normalData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should block SQL injection attempts', async () => {
            const maliciousData = {
                query: "'; DROP TABLE users; --",
                search: "1' UNION SELECT * FROM passwords",
            };

            const response = await request(app).post('/test-suspicious').send(maliciousData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Suspicious request detected');
        });

        it('should block XSS attempts', async () => {
            const xssData = {
                content: '<script>alert("xss")</script>',
                description: 'javascript%3Aalert("xss")',
                bio: '<img src="x" onerror="alert(1)">',
            };

            const response = await request(app).post('/test-suspicious').send(xssData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should block path traversal attempts', async () => {
            const pathTraversalData = {
                file: '../../../etc/passwd',
                path: '..\\..\\windows\\system32',
            };

            const response = await request(app).post('/test-suspicious').send(pathTraversalData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should block command injection attempts', async () => {
            const commandInjectionData = {
                command: 'ls -la; rm -rf /',
                input: 'test | cat /etc/passwd',
            };

            const response = await request(app).post('/test-suspicious').send(commandInjectionData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('Request Size Limiting', () => {
        it('should allow requests under size limit', async () => {
            const smallData = { msg: 'hi' };

            const response = await request(app).post('/test-size').send(smallData);

            expect(response.status).toBe(200);
        });

        it('should block requests over size limit', async () => {
            // Create a large but not suspicious payload
            const largeDescription =
                'This is a very long description that contains many words and lots of text to exceed the limit. '.repeat(
                    4
                );
            const largeData = {
                title: 'Valid Restaurant',
                description: largeDescription,
                typeBusiness: 'vegan',
                tags: ['healthy', 'organic', 'plantbased'],
            };

            const response = await request(app)
                .post('/test-size')
                .set('content-length', JSON.stringify(largeData).length.toString())
                .send(largeData);

            // Should be blocked by size limit, not suspicious activity
            expect([400, 413]).toContain(response.status);
            expect(response.body.success).toBe(false);
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
            const response = await request(app).get('/test-user-agent').set('User-Agent', '');

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('User-Agent header is required');
        });

        it('should block malicious User-Agents', async () => {
            const maliciousAgents = ['sqlmap/1.0', 'nikto/2.1.6', 'Netsparker', 'Acunetix'];

            for (const agent of maliciousAgents) {
                const response = await request(app).get('/test-user-agent').set('User-Agent', agent);

                expect(response.status).toBe(403);
                expect(response.body.message).toBe('Blocked user agent');
            }
        });
    });

    describe('Correlation ID', () => {
        it('should add correlation ID if not provided', async () => {
            const response = await request(app).get('/test-correlation');

            expect(response.status).toBe(200);
            expect(response.body.correlationId).toBeDefined();
            expect(response.headers['x-correlation-id']).toBeDefined();
            expect(response.body.correlationId).toBe(response.headers['x-correlation-id']);
        });

        it('should use provided correlation ID', async () => {
            const customId = 'custom-correlation-id-123';

            const response = await request(app).get('/test-correlation').set('X-Correlation-ID', customId);

            expect(response.status).toBe(200);
            expect(response.body.correlationId).toBe(customId);
            expect(response.headers['x-correlation-id']).toBe(customId);
        });

        it('should use X-Request-ID as fallback', async () => {
            const requestId = 'request-id-456';

            const response = await request(app).get('/test-correlation').set('X-Request-ID', requestId);

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
                        bio: '<script>alert("nested xss")</script>',
                    },
                },
            };

            const response = await request(app).post('/test-suspicious').send(nestedMaliciousData);

            expect(response.status).toBe(400);
        });

        it('should handle array values in suspicious activity detection', async () => {
            const arrayMaliciousData = {
                tags: ['normal', '<script>alert("xss")</script>', 'another'],
            };

            const response = await request(app).post('/test-suspicious').send(arrayMaliciousData);

            expect(response.status).toBe(400);
        });
    });
});

describe('Security Middleware - HTTPS Enforcement', () => {
    let mockReq: MockRequest;
    let mockRes: MockResponse;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockReq = createMockRequest();
        mockRes = createMockResponse();
        mockNext = createMockNext();
    });

    describe('enforceHTTPS', () => {
        it('should allow HTTPS requests to pass through', () => {
            mockReq.protocol = 'https';

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockRes._status).toBeUndefined();
            expect(mockRes._redirect).toBeUndefined();
        });

        it('should allow non-production environments to pass through', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            mockReq.protocol = 'http';

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockRes._status).toBeUndefined();
            expect(mockRes._redirect).toBeUndefined();

            process.env.NODE_ENV = originalEnv;
        });

        it('should reject requests with invalid host header format', () => {
            process.env.NODE_ENV = 'production';
            mockReq.protocol = 'http';
            mockReq.get = vi.fn().mockReturnValue('invalid-host-format<script>');

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes._status).toBe(400);
            expect(mockRes._json).toEqual({
                success: false,
                message: 'Invalid host header format',
            });
        });

        it('should reject requests with suspicious characters in host', () => {
            process.env.NODE_ENV = 'production';
            mockReq.protocol = 'http';
            mockReq.get = vi.fn().mockReturnValue('example.com<script>');

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes._status).toBe(400);
            expect(mockRes._json).toEqual({
                success: false,
                message: 'Invalid request parameters',
            });
        });

        it('should reject requests with JavaScript protocol in URL', () => {
            process.env.NODE_ENV = 'production';
            mockReq.protocol = 'http';
            mockReq.get = vi.fn().mockReturnValue('example.com');
            mockReq.originalUrl = '/javascript:alert(1)';

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes._status).toBe(400);
            expect(mockRes._json).toEqual({
                success: false,
                message: 'Invalid request parameters',
            });
        });

        it('should reject requests with path traversal attempts', () => {
            process.env.NODE_ENV = 'production';
            mockReq.protocol = 'http';
            mockReq.get = vi.fn().mockReturnValue('example.com');
            mockReq.originalUrl = '/../../../etc/passwd';

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes._status).toBe(400);
            expect(mockRes._json).toEqual({
                success: false,
                message: 'Invalid URL path',
            });
        });

        it('should reject requests with host mismatch', () => {
            process.env.NODE_ENV = 'production';
            mockReq.protocol = 'http';
            mockReq.get = vi
                .fn()
                .mockReturnValueOnce('malicious.com') // host header
                .mockReturnValueOnce('example.com'); // request host

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes._status).toBe(400);
            expect(mockRes._json).toEqual({
                success: false,
                message: 'Host mismatch',
            });
        });

        it('should allow valid HTTPS redirect for production', () => {
            process.env.NODE_ENV = 'production';
            mockReq.protocol = 'http';
            mockReq.get = vi.fn().mockReturnValue('example.com');
            mockReq.originalUrl = '/api/test';

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes._redirect).toEqual({
                status: 302,
                url: 'https://example.com/api/test',
            });
        });

        it('should sanitize URL path and allow redirect', () => {
            process.env.NODE_ENV = 'production';
            mockReq.protocol = 'http';
            mockReq.get = vi.fn().mockReturnValue('example.com');
            mockReq.originalUrl = '/api/test?param=value<script>';

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes._redirect).toEqual({
                status: 302,
                url: 'https://example.com/api/test',
            });
        });

        it('should reject requests with invalid redirect URL format', () => {
            process.env.NODE_ENV = 'production';
            mockReq.protocol = 'http';
            mockReq.get = vi.fn().mockReturnValue('invalid://host');
            mockReq.originalUrl = '/test';

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes._status).toBe(400);
            expect(mockRes._json).toEqual({
                success: false,
                message: 'Invalid redirect URL format',
            });
        });

        it('should handle valid host with port', () => {
            process.env.NODE_ENV = 'production';
            mockReq.protocol = 'http';
            mockReq.get = vi.fn().mockReturnValue('example.com:8080');
            mockReq.originalUrl = '/api/test';

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes._redirect).toEqual({
                status: 302,
                url: 'https://example.com:8080/api/test',
            });
        });
    });
});
