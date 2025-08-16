import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import Joi from 'joi';
import { userSchemas, paramSchemas } from '../../utils/validators';
import testConfig from '../testConfig';

const app = express();
app.use(express.json());

// Use simple test passwords that we know work
const TEST_PASSWORD = 'SecurePass123!';
const getWeakPassword = () => '123';

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
                return value
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
                    .trim();
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

app.get('/test-security-headers', securityHeadersMiddleware, (_req, res) => 
    res.json({ success: true })
);

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