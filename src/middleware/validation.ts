import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { ValidationSchema } from '../types/validation';

// Validation middleware factory
export const validate = (schema: ValidationSchema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const validationPromises = [];

            // Validate body if schema provided
            if (schema.body) {
                validationPromises.push(
                    schema.body
                        .validateAsync(req.body, {
                            abortEarly: false,
                            stripUnknown: true,
                            convert: true,
                        })
                        .then((value: Record<string, unknown>) => {
                            req.body = value;
                        })
                );
            }

            // Validate query parameters if schema provided
            if (schema.query) {
                validationPromises.push(
                    schema.query
                        .validateAsync(req.query, {
                            abortEarly: false,
                            stripUnknown: true,
                            convert: true,
                        })
                        .then((value: Record<string, unknown>) => {
                            // Handle read-only query object in test environment
                            if (process.env.NODE_ENV === 'test') {
                                Object.assign(req.query, value);
                            } else {
                                (req.query as Record<string, unknown>) = value;
                            }
                        })
                );
            }

            // Validate URL parameters if schema provided
            if (schema.params) {
                validationPromises.push(
                    schema.params
                        .validateAsync(req.params, {
                            abortEarly: false,
                            stripUnknown: true,
                            convert: true,
                        })
                        .then((value: Record<string, unknown>) => {
                            (req.params as Record<string, unknown>) = value;
                        })
                );
            }

            await Promise.all(validationPromises);
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

// Sanitization middleware
export const sanitizeInput = () => {
    // In test environment, return a minimal sanitization middleware
    if (process.env.NODE_ENV === 'test') {
        return [
            (req: Request, _res: Response, next: NextFunction) => {
                // Basic sanitization for tests
                const sanitizeValue = (value: unknown): unknown => {
                    if (typeof value === 'string') {
                        // Remove script tags and dangerous content
                        let sanitized = value
                            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                            .replace(/javascript:/gi, '')
                            .replace(/on\w+\s*=/gi, '');

                        // Remove control characters safely using string methods
                        sanitized = sanitized
                            .split('')
                            .filter(char => {
                                const code = char.charCodeAt(0);
                                return code >= 32 && code !== 127; // Keep printable characters, remove control chars
                            })
                            .join('');

                        return sanitized;
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

                req.body = sanitizeValue(req.body);
                next();
            },
        ];
    }

    const middlewares: Array<(req: Request, res: Response, next: NextFunction) => void> = [];

    // Use mongo sanitization in non-test environments
    middlewares.push(mongoSanitize());

    // Add custom sanitization middleware
    middlewares.push(
        // Enhanced XSS and injection protection
        (req: Request, _res: Response, next: NextFunction) => {
            // Fields that should not be sanitized (passwords, tokens, etc.)
            const skipSanitization = [
                'password',
                'currentPassword',
                'newPassword',
                'confirmPassword',
                'token',
                'refreshToken',
            ];

            const sanitizeValue = (value: unknown, fieldName?: string): unknown => {
                // Skip sanitization for password fields
                if (fieldName && skipSanitization.includes(fieldName)) {
                    return value;
                }

                if (typeof value === 'string') {
                    // Enhanced XSS protection patterns - using non-backtracking regex
                    let sanitized = value
                        // Remove script tags (all variations) - non-backtracking pattern
                        .replace(/<script[^>]*?>/gi, '')
                        .replace(/<\/script>/gi, '')

                        // Remove javascript: protocol (all encoded variations)
                        .replace(/javascript\s*:/gi, '')
                        .replace(/j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:/gi, '')
                        .replace(/javascript%3A/gi, '')
                        .replace(/javascript&#x3A;/gi, '')
                        .replace(/javascript&#58;/gi, '')

                        // Remove vbscript: protocol
                        .replace(/vbscript\s*:/gi, '')
                        .replace(/vbscript%3A/gi, '')

                        // Remove data: protocol for potential data URLs
                        .replace(/data\s*:/gi, '')
                        .replace(/data%3A/gi, '')

                        // Remove event handlers - non-backtracking pattern
                        .replace(/on\w+\s*=/gi, '')
                        .replace(/on[a-z]+\s*=/gi, '')

                        // Remove HTML entities that could be used for XSS - non-backtracking
                        .replace(/&[#x]?[a-zA-Z0-9]{1,8};/g, '')

                        // Remove potential CSS expressions
                        .replace(/expression\s*\(/gi, '')
                        .replace(/behaviour:/gi, '')

                        // Remove URL encoded characters that could bypass filters
                        .replace(/%[0-9a-fA-F]{2}/g, '');

                    // Remove control characters safely using string methods
                    sanitized = sanitized
                        .split('')
                        .filter((char: string) => {
                            const code = char.charCodeAt(0);
                            return code >= 32 && code !== 127; // Keep printable characters, remove control chars
                        })
                        .join('');

                    // Only remove dangerous HTML characters for non-password fields
                    return sanitized.replace(/</g, '').replace(/>/g, '').trim();
                }

                if (Array.isArray(value)) {
                    return value.map((item, index) => sanitizeValue(item, `${fieldName}[${index}]`));
                }

                if (value && typeof value === 'object') {
                    const sanitized: Record<string, unknown> = {};
                    for (const [key, val] of Object.entries(value)) {
                        sanitized[key] = sanitizeValue(val, key);
                    }
                    return sanitized;
                }

                return value;
            };

            if (req.body) {
                req.body = sanitizeValue(req.body);
            }

            if (req.query) {
                try {
                    (req.query as Record<string, unknown>) = sanitizeValue(req.query) as Record<string, unknown>;
                } catch (error) {
                    // Handle read-only query object in test environment
                    if (process.env.NODE_ENV === 'test') {
                        const sanitizedQuery = sanitizeValue(req.query) as Record<string, unknown>;
                        Object.assign(req.query, sanitizedQuery);
                    } else {
                        throw error;
                    }
                }
            }

            if (req.params) {
                try {
                    (req.params as Record<string, unknown>) = sanitizeValue(req.params) as Record<string, unknown>;
                } catch (error) {
                    // Handle read-only params object in test environment
                    if (process.env.NODE_ENV === 'test') {
                        const sanitizedParams = sanitizeValue(req.params) as Record<string, unknown>;
                        Object.assign(req.params, sanitizedParams);
                    } else {
                        throw error;
                    }
                }
            }

            next();
        }
    );

    return middlewares;
};

// Rate limiting factory
export const createRateLimit = (
    config: Partial<{ windowMs: number; max: number; message: string }> = {}
): RateLimitRequestHandler => {
    // Use test-friendly rate limiting in test environment
    const testConfig =
        process.env.NODE_ENV === 'test'
            ? {
                  windowMs: 1000, // 1 second for tests
                  max: 5, // 5 requests per second for tests
                  ...config,
              }
            : config;

    return rateLimit({
        windowMs: testConfig.windowMs || 15 * 60 * 1000, // 15 minutes
        max: testConfig.max || 100,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (_req: Request, res: Response) => {
            res.status(429).json({
                success: false,
                message: testConfig.message ?? 'Too many requests from this IP, please try again later.',
            });
        },
    });
};

// Helper function to create rate limit or bypass for tests
const createRateLimitOrBypass = (config: { windowMs: number; max: number; message: string }) => {
    // If rate limiting is disabled for tests, return a no-op middleware
    if (process.env.DISABLE_RATE_LIMIT === 'true') {
        return (_req: Request, _res: Response, next: NextFunction) => next();
    }

    return createRateLimit(config);
};

// Predefined rate limits for different endpoints
export const rateLimits = {
    // Authentication endpoints - stricter limits
    auth: createRateLimitOrBypass({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 attempts per window
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
    }),

    // Registration endpoint - very strict
    register: createRateLimitOrBypass({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // 3 registration attempts per hour
        message: 'Too many registration attempts. Please try again in 1 hour.',
    }),

    // General API endpoints
    api: createRateLimitOrBypass({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // 100 requests per window
        message: 'API rate limit exceeded. Please slow down your requests.',
    }),

    // Search endpoints - moderate limits
    search: createRateLimitOrBypass({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 30, // 30 searches per minute
        message: 'Search rate limit exceeded. Please wait before searching again.',
    }),

    // Upload endpoints - stricter limits
    upload: createRateLimitOrBypass({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10, // 10 uploads per window
        message: 'Upload rate limit exceeded. Please try again later.',
    }),
};

// Validation error handler
export const handleValidationError = (error: unknown, _req: Request, res: Response, next: NextFunction) => {
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
            timestamp: new Date().toISOString(),
        });
    }

    return next(error);
};

// Security headers middleware
export const securityHeaders = (_req: Request, res: Response, next: NextFunction) => {
    // Remove server information
    res.removeHeader('X-Powered-By');

    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "font-src 'self' https: data:; " +
            "connect-src 'self' https:; " +
            "frame-ancestors 'none';"
    );

    next();
};

// Input length validation middleware
export const validateInputLength = (maxBodySize: number = 1024 * 1024) => {
    // 1MB default
    return (req: Request, res: Response, next: NextFunction) => {
        const contentLength = req.get('content-length');

        if (contentLength && parseInt(contentLength) > maxBodySize) {
            return res.status(413).json({
                success: false,
                message: 'Request body too large',
                maxSize: `${maxBodySize / 1024 / 1024}MB`,
            });
        }

        return next();
    };
};
