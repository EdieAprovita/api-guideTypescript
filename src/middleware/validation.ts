import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// Validation middleware
export const validate = (schema: { body?: Joi.ObjectSchema; query?: Joi.ObjectSchema; params?: Joi.ObjectSchema }) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const errors: string[] = [];

        if (schema.body) {
            const { error } = schema.body.validate(req.body);
            if (error) {
                errors.push(`Body: ${error.details.map(d => d.message).join(', ')}`);
            }
        }

        if (schema.query) {
            const { error } = schema.query.validate(req.query);
            if (error) {
                errors.push(`Query: ${error.details.map(d => d.message).join(', ')}`);
            }
        }

        if (schema.params) {
            const { error } = schema.params.validate(req.params);
            if (error) {
                errors.push(`Params: ${error.details.map(d => d.message).join(', ')}`);
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors,
            });
        }

        return next();
    };
};

// Rate limiting configurations
export const rateLimits = {
    api: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: {
            success: false,
            message: 'Too many requests from this IP, please try again later.',
        },
        standardHeaders: true,
        legacyHeaders: false,
    }),

    auth: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // limit each IP to 5 auth requests per windowMs
        message: {
            success: false,
            message: 'Too many authentication attempts, please try again later.',
        },
        standardHeaders: true,
        legacyHeaders: false,
    }),

    strict: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 20, // limit each IP to 20 requests per windowMs
        message: {
            success: false,
            message: 'Rate limit exceeded for this endpoint.',
        },
        standardHeaders: true,
        legacyHeaders: false,
    }),
};

// Security headers middleware
export const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'https:'],
            fontSrc: ["'self'", 'https:', 'data:'],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
});

// Input length validation middleware
export const validateInputLength = (maxLength: number = 1000) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const checkLength = (obj: any, path: string = ''): string | null => {
            if (typeof obj === 'string') {
                if (obj.length > maxLength) {
                    return `${path || 'Input'} exceeds maximum length of ${maxLength} characters`;
                }
            } else if (typeof obj === 'object' && obj !== null) {
                for (const [key, value] of Object.entries(obj)) {
                    const currentPath = path ? `${path}.${key}` : key;
                    const error = checkLength(value, currentPath);
                    if (error) return error;
                }
            }
            return null;
        };

        const bodyError = checkLength(req.body, 'body');
        const queryError = checkLength(req.query, 'query');
        const paramsError = checkLength(req.params, 'params');

        const error = bodyError || queryError || paramsError;
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Input validation failed',
                error,
            });
        }

        return next();
    };
};
