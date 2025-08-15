import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
// import mongoSanitize from 'express-mongo-sanitize'; // Disabled due to version conflict
import { ValidationSchema } from '../types/validation';

// Working validation middleware factory
export const validate = (schema: ValidationSchema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Validate body if schema provided
            if (schema.body) {
                const validatedBody = await schema.body.validateAsync(req.body, {
                    abortEarly: false,
                    stripUnknown: true,
                    convert: true,
                });
                req.body = validatedBody;
            }

            // Validate query parameters if schema provided
            if (schema.query) {
                const validatedQuery = await schema.query.validateAsync(req.query, {
                    abortEarly: false,
                    stripUnknown: true,
                    convert: true,
                });
                Object.keys(req.query).forEach(key => delete req.query[key]);
                Object.assign(req.query, validatedQuery);
            }

            // Validate URL parameters if schema provided
            if (schema.params) {
                const validatedParams = await schema.params.validateAsync(req.params, {
                    abortEarly: false,
                    stripUnknown: true,
                    convert: true,
                });
                Object.keys(req.params).forEach(key => delete req.params[key]);
                Object.assign(req.params, validatedParams);
            }
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
    return [
        // MongoDB injection protection
        // mongoSanitize(), // disabled due to version conflict

        // Enhanced XSS and injection protection
        (req: Request, _res: Response, next: NextFunction) => {
            const sanitizeValue = (value: unknown): unknown => {
                if (typeof value === 'string') {
                    // More targeted XSS protection - remove specific dangerous patterns
                    return (
                        value
                            // Remove complete script blocks (opening tag, content, closing tag)
                            .replace(/<script[^>]*>.*?<\/script>/gis, '')
                            
                            // Remove any remaining script tags
                            .replace(/<\/?script[^>]*>/gi, '')

                            // Remove javascript: protocol (all encoded variations)
                            .replace(/javascript\s*:/gi, '')
                            .replace(/j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:/gi, '')
                            .replace(/javascript%3A/gi, '')
                            .replace(/javascript&#x3A;/gi, '')
                            .replace(/javascript&#58;/gi, '')

                            // Remove vbscript: protocol
                            .replace(/vbscript\s*:/gi, '')
                            .replace(/vbscript%3A/gi, '')

                            // Remove dangerous event handlers
                            .replace(/onerror\s*=/gi, '')
                            .replace(/onload\s*=/gi, '')
                            .replace(/onclick\s*=/gi, '')
                            .replace(/onmouseover\s*=/gi, '')

                            // Remove potential CSS expressions
                            .replace(/expression\s*\(/gi, '')
                            .replace(/behaviour:/gi, '')

                            // Remove URL encoded dangerous characters
                            .replace(/%3C/gi, '') // <
                            .replace(/%3E/gi, '') // >
                            .replace(/%22/gi, '') // "
                            .replace(/%27/gi, '') // '

                            // Remove control characters safely using Unicode property escapes
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

            if (req.query) {
                const sanitizedQuery = sanitizeValue(req.query) as Record<string, unknown>;
                Object.keys(req.query).forEach(key => delete req.query[key]);
                Object.assign(req.query, sanitizedQuery);
            }

            if (req.params) {
                const sanitizedParams = sanitizeValue(req.params) as Record<string, unknown>;
                Object.keys(req.params).forEach(key => delete req.params[key]);
                Object.assign(req.params, sanitizedParams);
            }

            next();
        },
    ];
};

// Rate limiting factory
export const createRateLimit = (
    config: Partial<{ windowMs: number; max: number; message: string }> = {}
): RateLimitRequestHandler => {
    return rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (_req: Request, res: Response) => {
            res.status(429).json({
                success: false,
                message: config.message ?? 'Too many requests from this IP, please try again later.',
            });
        },
        ...config,
    });
};

// Predefined rate limits for different endpoints
export const rateLimits = {
    // Authentication endpoints - stricter limits
    auth: createRateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 attempts per window
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
    }),

    // Registration endpoint - very strict
    register: createRateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // 3 registration attempts per hour
        message: 'Too many registration attempts. Please try again in 1 hour.',
    }),

    // General API endpoints
    api: createRateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // 100 requests per window
        message: 'API rate limit exceeded. Please slow down your requests.',
    }),

    // Search endpoints - moderate limits
    search: createRateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 30, // 30 searches per minute
        message: 'Search rate limit exceeded. Please wait before searching again.',
    }),

    // Upload endpoints - stricter limits
    upload: createRateLimit({
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
