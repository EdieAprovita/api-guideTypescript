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
                            (req.query as Record<string, unknown>) = value;
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
    return [
        // MongoDB injection protection
        mongoSanitize(),

        // Enhanced XSS and injection protection
        (req: Request, _res: Response, next: NextFunction) => {
            const sanitizeValue = (value: unknown): unknown => {
                if (typeof value === 'string') {
                    // Enhanced XSS protection patterns
                    return (
                        value
                            // Remove script tags (all variations)
                            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                            .replace(/<\/?\s*script\s*>/gi, '')

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

                            // Remove event handlers
                            .replace(/on\w+\s*=/gi, '')
                            .replace(/on[a-z]+\s*=/gi, '')
                            // Remove HTML tags safely - use non-backtracking pattern
                            .replace(/<[^>]*?>/g, '')
                            // Remove HTML entities that could be used for XSS
                            .replace(/&[#x]?[a-zA-Z0-9]{1,8};/g, '')

                            // Remove potential CSS expressions
                            .replace(/expression\s*\(/gi, '')
                            .replace(/behaviour:/gi, '')

                            // Remove URL encoded characters that could bypass filters
                            .replace(/%[0-9a-fA-F]{2}/g, '')

                            // Remove control characters safely using Unicode property escapes
                            .replace(/\p{C}/gu, '')

                            // Remove dangerous single characters directly (no character class)
                            .replace(/</g, '')
                            .replace(/>/g, '')
                            .replace(/'/g, '')
                            .replace(/"/g, '')
                            .replace(/&/g, '')
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
                (req.query as Record<string, unknown>) = sanitizeValue(req.query) as Record<string, unknown>;
            }

            if (req.params) {
                (req.params as Record<string, unknown>) = sanitizeValue(req.params) as Record<string, unknown>;
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
