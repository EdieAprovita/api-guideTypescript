import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import Joi from 'joi';
import { userSchemas, paramSchemas, commonSchemas, querySchemas } from '../../utils/validators.js';
import { validate, validateInputLength, sanitizeInput } from '../../middleware/validation.js';
import testConfig from '../testConfig.js';

const app = express();
app.use(express.json());

const TEST_PASSWORD = testConfig.passwords.validPassword;
const getWeakPassword = () => testConfig.passwords.weakPassword;

// Create a working validation middleware
const createValidationMiddleware = (schema: Joi.Schema) => {
    return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
            const validatedData = await schema.validateAsync(req.body, {
                abortEarly: false,
                stripUnknown: true,
                convert: true,
            });
            req.body = validatedData;
            next();
        } catch (error) {
            if (error instanceof Joi.ValidationError) {
                const validationErrors = error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                    value: detail.context?.value,
                }));

                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validationErrors,
                });
            }
            return next(error);
        }
    };
};

// Create param validation middleware
const createParamValidationMiddleware = (schema: Joi.Schema) => {
    return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
            const validatedParams = await schema.validateAsync(req.params, {
                abortEarly: false,
                stripUnknown: true,
                convert: true,
            });
            req.params = validatedParams;
            next();
        } catch (error) {
            if (error instanceof Joi.ValidationError) {
                const validationErrors = error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                    value: detail.context?.value,
                }));

                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validationErrors,
                });
            }
            return next(error);
        }
    };
};

// Create sanitization middleware
const createSanitizationMiddleware = () => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const sanitizeValue = (value: unknown): unknown => {
            if (typeof value === 'string') {
                return (
                    value
                        // Remove script tags completely
                        .replace(/<script[^>]*>.*?<\/script>/gis, '')
                        .replace(/<\/?script[^>]*>/gi, '')
                        // Remove javascript: protocol
                        .replace(/javascript\s*:/gi, '')
                        .replace(/javascript%3A/gi, '')
                        // Remove dangerous event handlers
                        .replace(/onerror\s*=/gi, '')
                        .replace(/onload\s*=/gi, '')
                        .replace(/onclick\s*=/gi, '')
                        // Remove control characters
                        .replace(/\p{C}/gu, '')
                        .trim()
                );
            }

            if (Array.isArray(value)) {
                return value.map(sanitizeValue);
            }

            if (value && typeof value === 'object') {
                const sanitized: Record<string, unknown> = {};
                for (const [key, val] of Object.entries(value)) {
                    sanitized[key] = sanitizeValue(val);
                }
                return sanitized;
            }

            return value;
        };

        if (req.body) {
            req.body = sanitizeValue(req.body);
        }

        next();
    };
};

// Create security headers middleware
const securityHeadersMiddleware = (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    next();
};

// Test routes
app.post('/test-user-validation', createValidationMiddleware(userSchemas.register), (_req, res) =>
    res.json({ success: true, data: _req.body })
);

app.get('/test-param-validation/:id', createParamValidationMiddleware(paramSchemas.id), (_req, res) =>
    res.json({ success: true, params: _req.params })
);

app.post('/test-sanitization', createSanitizationMiddleware(), (_req, res) =>
    res.json({ success: true, body: _req.body })
);

app.get('/test-security-headers', securityHeadersMiddleware, (_req, res) => res.json({ success: true }));

// ---------------------------------------------------------------------------
// Additional routes for B4-02 edge-case tests
// ---------------------------------------------------------------------------

// Route: pagination limit cap enforcement via commonSchemas.pagination
const paginationSchema = Joi.object({
    page: commonSchemas.pagination.page,
    limit: commonSchemas.pagination.limit,
});

app.get('/test-pagination', validate({ query: paginationSchema }), (_req, res) =>
    res.json({ success: true, query: _req.query })
);

// Route: search query schema (limit + sortBy/sortOrder)
app.get('/test-search-query', validate({ query: querySchemas.search }), (_req, res) =>
    res.json({ success: true, query: _req.query })
);

// Route: NoSQL injection via actual sanitizeInput() from validation.ts
app.post('/test-nosql-sanitize', ...sanitizeInput(), (_req, res) => res.json({ success: true, body: _req.body }));

// Route: validateInputLength hard cap
app.post(
    '/test-input-length',
    validateInputLength(100), // 100 bytes cap for test
    (_req, res) => res.json({ success: true })
);

// Route: full sanitizeInput() from validation.ts (covers vbscript:, %3C/%3E, etc.)
app.post('/test-full-sanitization', ...sanitizeInput(), (_req, res) => res.json({ success: true, body: _req.body }));

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ success: false, error: err.message });
});

describe('Validation Middleware Tests', () => {
    describe('Input Validation', () => {
        it('should validate user registration data correctly', async () => {
            const validUserData = {
                username: 'johndoe',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                password: TEST_PASSWORD,
                dateOfBirth: '1990-01-01',
            };

            const response = await request(app).post('/test-user-validation').send(validUserData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.email).toBe(validUserData.email);
        });

        it('should reject invalid email format', async () => {
            const invalidUserData = {
                username: 'johndoe',
                firstName: 'John',
                lastName: 'Doe',
                email: 'invalid-email',
                password: TEST_PASSWORD,
                dateOfBirth: '1990-01-01',
            };

            const response = await request(app).post('/test-user-validation').send(invalidUserData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Validation failed');
            expect(response.body.errors.length).toBeGreaterThan(0);
            expect(response.body.errors.some((error: { field: string }) => error.field === 'email')).toBe(true);
        });

        it('should reject weak passwords', async () => {
            const weakPasswordData = {
                username: 'johndoe',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                password: getWeakPassword(),
                dateOfBirth: '1990-01-01',
            };

            const response = await request(app).post('/test-user-validation').send(weakPasswordData);

            expect(response.status).toBe(400);
            expect(response.body.errors[0].field).toBe('password');
        });

        it('should validate ObjectId parameters', async () => {
            const validObjectId = '507f1f77bcf86cd799439011';

            const response = await request(app).get(`/test-param-validation/${validObjectId}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.params.id).toBe(validObjectId);
        });

        it('should reject invalid ObjectId parameters', async () => {
            const invalidObjectId = 'invalid-id';

            const response = await request(app).get(`/test-param-validation/${invalidObjectId}`);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.errors[0].field).toBe('id');
        });
    });

    describe('Input Sanitization', () => {
        it('should sanitize XSS attempts', async () => {
            const maliciousData = {
                name: '<script>alert("xss")</script>',
                description: 'javascript:alert("xss")',
                content: '<img src="x" onerror="alert(1)">',
            };

            const response = await request(app).post('/test-sanitization').send(maliciousData);

            expect(response.status).toBe(200);
            expect(response.body.body.name).not.toContain('<script>');
            expect(response.body.body.description).not.toContain('javascript');
            expect(response.body.body.content).not.toContain('onerror=');
        });

        it('should remove control characters', async () => {
            const controlChars = '\u0000\u0001\u001F\u007F';
            const dataWithControlChars = {
                text: `Normal text${controlChars}`,
            };

            const response = await request(app).post('/test-sanitization').send(dataWithControlChars);

            expect(response.status).toBe(200);
            expect(response.body.body.text).toBe('Normal text');
        });

        it('should handle nested objects', async () => {
            const nestedData = {
                user: {
                    profile: {
                        bio: '<script>alert("nested xss")</script>',
                    },
                },
            };

            const response = await request(app).post('/test-sanitization').send(nestedData);

            expect(response.status).toBe(200);
            expect(response.body.body.user.profile.bio).not.toContain('<script>');
        });
    });

    describe('Security Headers', () => {
        it('should add security headers', async () => {
            const response = await request(app).get('/test-security-headers');

            expect(response.status).toBe(200);
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-frame-options']).toBe('DENY');
            expect(response.headers['x-xss-protection']).toBe('1; mode=block');
            expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
            expect(response.headers['content-security-policy']).toBeDefined();
            expect(response.headers['x-powered-by']).toBeUndefined();
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty request body', async () => {
            const response = await request(app).post('/test-user-validation').send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('errors');
            expect(Array.isArray(response.body.errors)).toBe(true);
            expect(response.body.errors.length).toBeGreaterThan(0);
        });

        it('should handle null values', async () => {
            const response = await request(app).post('/test-sanitization').send({ name: null, value: undefined });

            expect(response.status).toBe(200);
        });

        it('should handle arrays with malicious content', async () => {
            const maliciousArray = {
                tags: ['normal', '<script>alert("xss")</script>', 'another'],
            };

            const response = await request(app).post('/test-sanitization').send(maliciousArray);

            expect(response.status).toBe(200);
            expect(response.body.body.tags).not.toContain('<script>alert("xss")</script>');
            expect(response.body.body.tags.some((tag: string) => tag.includes('<script>'))).toBe(false);
        });

        it('should preserve safe content during sanitization', async () => {
            const safeData = {
                name: 'John Doe',
                email: 'john@example.com',
                description: 'This is a safe description with normal text.',
            };

            const response = await request(app).post('/test-sanitization').send(safeData);

            expect(response.status).toBe(200);
            expect(response.body.body.name).toBe(safeData.name);
            expect(response.body.body.email).toBe(safeData.email);
            expect(response.body.body.description).toBe(safeData.description);
        });
    });
});

// ---------------------------------------------------------------------------
// B4-02: Pagination hard-cap (limit > 100 rejected)
// ---------------------------------------------------------------------------

describe('Validation Edge Cases — Pagination hard cap', () => {
    it('should reject limit=101 (above hard cap of 100)', async () => {
        const response = await request(app).get('/test-pagination?limit=101&page=1');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errors.some((e: { field: string }) => e.field === 'limit')).toBe(true);
    });

    it('should reject limit=1000 (far above hard cap)', async () => {
        const response = await request(app).get('/test-pagination?limit=1000&page=1');

        expect(response.status).toBe(400);
        expect(response.body.errors.some((e: { field: string }) => e.field === 'limit')).toBe(true);
    });

    it('should accept limit=100 (boundary — exactly at cap)', async () => {
        const response = await request(app).get('/test-pagination?limit=100&page=1');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        // Joi convert:true coerces query string to number
        expect(Number(response.body.query.limit)).toBe(100);
    });

    it('should accept limit=1 (minimum boundary)', async () => {
        const response = await request(app).get('/test-pagination?limit=1&page=1');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });

    it('should reject limit=0 (below minimum of 1)', async () => {
        const response = await request(app).get('/test-pagination?limit=0&page=1');

        expect(response.status).toBe(400);
        expect(response.body.errors.some((e: { field: string }) => e.field === 'limit')).toBe(true);
    });

    it('should reject page=0 (minimum page is 1)', async () => {
        const response = await request(app).get('/test-pagination?limit=10&page=0');

        expect(response.status).toBe(400);
        expect(response.body.errors.some((e: { field: string }) => e.field === 'page')).toBe(true);
    });

    it('should use defaults when limit and page are omitted', async () => {
        const response = await request(app).get('/test-pagination');

        // Joi defaults apply: page=1, limit=10
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Number(response.body.query.page)).toBe(1);
        expect(Number(response.body.query.limit)).toBe(10);
    });

    it('should reject a non-numeric limit', async () => {
        const response = await request(app).get('/test-pagination?limit=abc&page=1');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// B4-02: NoSQL injection sanitization (mongo operator keys)
// ---------------------------------------------------------------------------

describe('Validation Edge Cases — NoSQL injection sanitization', () => {
    it('should sanitize a top-level $where operator key in the request body', async () => {
        const payload = { $where: 'function() { return true; }', name: 'safe' };

        const response = await request(app).post('/test-nosql-sanitize').send(payload);

        expect(response.status).toBe(200);
        // express-mongo-sanitize replaces $ keys — the original key must not reach the handler intact
        expect(response.body.body).not.toHaveProperty('$where');
    });

    it('should sanitize a nested $gt operator used in a credential bypass attempt', async () => {
        const payload = { username: 'admin', password: { $gt: '' } };

        const response = await request(app).post('/test-nosql-sanitize').send(payload);

        expect(response.status).toBe(200);
        // The nested $gt key should have been stripped or replaced
        const passwordField = response.body.body.password as Record<string, unknown>;
        expect(passwordField).not.toHaveProperty('$gt');
    });

    it('should sanitize $ne operator used to bypass equality checks', async () => {
        const payload = { role: { $ne: 'user' } };

        const response = await request(app).post('/test-nosql-sanitize').send(payload);

        expect(response.status).toBe(200);
        const roleField = response.body.body.role as Record<string, unknown>;
        expect(roleField).not.toHaveProperty('$ne');
    });

    it('should pass through safe data unchanged', async () => {
        const payload = { username: 'john', email: 'john@example.com' };

        const response = await request(app).post('/test-nosql-sanitize').send(payload);

        expect(response.status).toBe(200);
        expect(response.body.body.username).toBe('john');
        expect(response.body.body.email).toBe('john@example.com');
    });
});

// ---------------------------------------------------------------------------
// B4-02: validateInputLength hard cap (413 Payload Too Large)
// ---------------------------------------------------------------------------

describe('Validation Edge Cases — validateInputLength', () => {
    it('should return 413 when Content-Length exceeds the configured cap', async () => {
        // 100-byte cap configured on /test-input-length.
        // Send a raw string body larger than 100 bytes so supertest sets an accurate content-length.
        const largeBody = 'x'.repeat(200);

        const response = await request(app)
            .post('/test-input-length')
            .set('Content-Type', 'text/plain')
            .send(largeBody);

        expect(response.status).toBe(413);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toMatch(/too large/i);
    });

    it('should call next() when Content-Length is within the cap', async () => {
        // supertest auto-sets Content-Length from the serialized body, so this
        // covers the normal "header present and within cap" path without manual header manipulation.
        const smallPayload = { ok: true };

        const response = await request(app).post('/test-input-length').send(smallPayload);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });

    it('should call next() when no Content-Length header is present', async () => {
        // supertest auto-sets Content-Length when .send() is used.
        // Passing an empty string to .set() removes the header from the request,
        // so req.get('content-length') returns undefined inside the middleware and
        // the `if (contentLength && ...)` guard is skipped — exercising the absent-header branch.
        const response = await request(app)
            .post('/test-input-length')
            .set('Content-Length', '')
            .send({ a: 1 });

        expect(response.status).toBe(200);
    });

    it('should return 413 when JSON body serializes to exactly 101 bytes (1 byte over cap)', async () => {
        // {"a":"<93 x's>"} = 6 + 93 + 2 = 101 bytes
        const body = { a: 'x'.repeat(93) };
        const serialized = JSON.stringify(body);
        expect(serialized.length).toBe(101);

        const response = await request(app)
            .post('/test-input-length')
            .set('Content-Type', 'application/json')
            .send(body);

        expect(response.status).toBe(413);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toMatch(/too large/i);
    });

    it('should return 200 when JSON body serializes to exactly 100 bytes (at cap boundary)', async () => {
        // {"a":"<92 x's>"} = 6 + 92 + 2 = 100 bytes
        const body = { a: 'x'.repeat(92) };
        const serialized = JSON.stringify(body);
        expect(serialized.length).toBe(100);

        const response = await request(app)
            .post('/test-input-length')
            .set('Content-Type', 'application/json')
            .send(body);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// B4-02: Malformed / boundary input — additional edge cases
// ---------------------------------------------------------------------------

describe('Validation Edge Cases — Malformed data and boundary values', () => {
    it('should reject a username shorter than the minimum length (2 chars)', async () => {
        const payload = {
            username: 'a',
            email: 'test@example.com',
            password: TEST_PASSWORD,
        };

        const response = await request(app).post('/test-user-validation').send(payload);

        expect(response.status).toBe(400);
        expect(response.body.errors.some((e: { field: string }) => e.field === 'username')).toBe(true);
    });

    it('should reject a username longer than the maximum length (50 chars)', async () => {
        const payload = {
            username: 'a'.repeat(51),
            email: 'test@example.com',
            password: TEST_PASSWORD,
        };

        const response = await request(app).post('/test-user-validation').send(payload);

        expect(response.status).toBe(400);
        expect(response.body.errors.some((e: { field: string }) => e.field === 'username')).toBe(true);
    });

    it('should reject a future date of birth', async () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        const payload = {
            username: 'johndoe',
            email: 'test@example.com',
            password: TEST_PASSWORD,
            dateOfBirth: futureDate.toISOString(),
        };

        const response = await request(app).post('/test-user-validation').send(payload);

        expect(response.status).toBe(400);
        expect(response.body.errors.some((e: { field: string }) => e.field === 'dateOfBirth')).toBe(true);
    });

    it('should reject a malformed ObjectId param (too short)', async () => {
        const response = await request(app).get('/test-param-validation/abc123');

        expect(response.status).toBe(400);
        expect(response.body.errors[0].field).toBe('id');
    });

    it('should reject a malformed ObjectId param containing SQL injection chars', async () => {
        const response = await request(app).get("/test-param-validation/1'; DROP TABLE users;--");

        expect(response.status).toBe(400);
        expect(response.body.errors[0].field).toBe('id');
    });

    it('should reject a password without special characters', async () => {
        const payload = {
            username: 'johndoe',
            email: 'test@example.com',
            password: 'SecurePass123', // no special char
        };

        const response = await request(app).post('/test-user-validation').send(payload);

        expect(response.status).toBe(400);
        expect(response.body.errors[0].field).toBe('password');
    });

    it('should reject a password without uppercase letters', async () => {
        const payload = {
            username: 'johndoe',
            email: 'test@example.com',
            password: 'securepass123!',
        };

        const response = await request(app).post('/test-user-validation').send(payload);

        expect(response.status).toBe(400);
        expect(response.body.errors[0].field).toBe('password');
    });

    it('should sanitize vbscript: protocol in addition to javascript: (full sanitizeInput middleware)', async () => {
        const payload = { link: 'vbscript:MsgBox("pwned")' };

        // Use /test-full-sanitization which mounts the actual sanitizeInput() from validation.ts
        const response = await request(app).post('/test-full-sanitization').send(payload);

        expect(response.status).toBe(200);
        expect(response.body.body.link).not.toContain('vbscript:');
    });

    it('should sanitize URL-encoded < and > characters that could reconstruct tags (full sanitizeInput middleware)', async () => {
        const payload = { input: '%3Cscript%3Ealert(1)%3C%2Fscript%3E' };

        // Use /test-full-sanitization which mounts the actual sanitizeInput() from validation.ts
        const response = await request(app).post('/test-full-sanitization').send(payload);

        expect(response.status).toBe(200);
        // %3C and %3E should be stripped by the full sanitizer
        expect(response.body.body.input).not.toContain('%3C');
        expect(response.body.body.input).not.toContain('%3E');
    });
});
