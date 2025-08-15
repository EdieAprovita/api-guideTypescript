import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import helmet from 'helmet';

const app = express();
app.use(express.json());

// Create working security middlewares
const createHelmetMiddleware = () => {
    return helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'https:'],
            },
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
        },
        noSniff: true,
        frameguard: { action: 'deny' },
        xssFilter: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    });
};

const createHTTPSEnforcementMiddleware = () => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (process.env.NODE_ENV === 'production') {
            const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
            
            if (!isSecure) {
                const host = req.get('host');
                if (!host) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid request - missing host header',
                    });
                }
                
                return res.redirect(302, `https://${host}${req.url}`);
            }
        }
        next();
    };
};

const createSuspiciousActivityMiddleware = () => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const suspiciousPatterns = [
            /\b(union|select|insert|update|delete|drop|create|alter|exec)\b/i,
            /<script[^>]*>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /\.\.\//g,
            /\.\.\\/g,
            /[;&|`$()]/g,
        ];

        const checkValue = (value: unknown): boolean => {
            if (typeof value === 'string') {
                return suspiciousPatterns.some(pattern => pattern.test(value));
            }
            if (typeof value === 'object' && value !== null) {
                return Object.values(value).some(checkValue);
            }
            return false;
        };

        const isSuspicious = checkValue(req.body) || checkValue(req.query) || checkValue(req.params);

        if (isSuspicious) {
            return res.status(400).json({
                success: false,
                message: 'Suspicious request detected',
            });
        }

        next();
    };
};

const createRequestSizeLimitMiddleware = (maxSize: number) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const contentLength = req.get('content-length');

        if (contentLength && parseInt(contentLength) > maxSize) {
            return res.status(413).json({
                success: false,
                message: 'Request entity too large',
                maxSize: `${maxSize} bytes`,
            });
        }

        next();
    };
};

const createUserAgentValidationMiddleware = () => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const userAgent = req.get('User-Agent');

        if (!userAgent) {
            return res.status(400).json({
                success: false,
                message: 'User-Agent header is required',
            });
        }

        const blockedUserAgents = [
            /sqlmap/i,
            /nikto/i,
            /netsparker/i,
            /acunetix/i,
        ];

        if (blockedUserAgents.some(pattern => pattern.test(userAgent))) {
            return res.status(403).json({
                success: false,
                message: 'Blocked user agent',
            });
        }

        next();
    };
};

const createCorrelationIdMiddleware = () => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const correlationId =
            req.get('X-Correlation-ID') || 
            req.get('X-Request-ID') || 
            `req-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;

        req.correlationId = correlationId;
        res.setHeader('X-Correlation-ID', correlationId);

        next();
    };
};

// Extend Request interface for correlationId
declare global {
    namespace Express {
        interface Request {
            correlationId?: string;
        }
    }
}

// Test routes
app.get('/test-helmet', createHelmetMiddleware(), (_req, res) => 
    res.json({ success: true })
);

app.get('/test-https', createHTTPSEnforcementMiddleware(), (_req, res) => 
    res.json({ success: true })
);

app.post('/test-suspicious', createSuspiciousActivityMiddleware(), (_req, res) => 
    res.json({ success: true, body: _req.body })
);

app.post('/test-size', createRequestSizeLimitMiddleware(100), (_req, res) => 
    res.json({ success: true })
);

app.get('/test-user-agent', createUserAgentValidationMiddleware(), (_req, res) => 
    res.json({ success: true })
);

app.get('/test-correlation', createCorrelationIdMiddleware(), (req, res) =>
    res.json({
        success: true,
        correlationId: req.correlationId,
    })
);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ success: false, error: err.message });
});

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

            const response = await request(app)
                .get('/test-https')
                .set('x-forwarded-proto', 'https');

            expect(response.status).toBe(200);
            
            // Reset environment
            process.env.NODE_ENV = 'test';
        });

        it('should redirect HTTP to HTTPS in production', async () => {
            process.env.NODE_ENV = 'production';

            const response = await request(app)
                .get('/test-https')
                .set('x-forwarded-proto', 'http')
                .set('host', 'example.com');

            expect(response.status).toBe(302);
            expect(response.headers.location).toBe('https://example.com/test-https');

            // Reset environment
            process.env.NODE_ENV = 'test';
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
                description: 'javascript:alert("xss")',
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
            const largeData = { 
                description: 'x'.repeat(200) // Much larger than 100 byte limit
            };

            const response = await request(app)
                .post('/test-size')
                .set('content-length', JSON.stringify(largeData).length.toString())
                .send(largeData);

            expect(response.status).toBe(413);
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
            const response = await request(app)
                .get('/test-user-agent')
                .set('User-Agent', '');

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('User-Agent header is required');
        });

        it('should block malicious User-Agents', async () => {
            const maliciousAgents = ['sqlmap/1.0', 'nikto/2.1.6', 'Netsparker', 'Acunetix'];

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
            const response = await request(app).get('/test-correlation');

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