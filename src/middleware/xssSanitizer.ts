import { Request, Response, NextFunction } from 'express';
// @ts-ignore - isomorphic-dompurify doesn't have types but works fine
import DOMPurify from 'isomorphic-dompurify';
import logger from '../utils/logger.js';

/**
 * Custom XSS sanitization middleware using DOMPurify
 * This is a secure replacement for express-xss-sanitizer
 *
 * DOMPurify is actively maintained and doesn't have the recursion depth vulnerability
 * that affects express-xss-sanitizer
 */

/**
 * Recursively sanitize an object, array, or string using DOMPurify
 */
const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
        // DOMPurify.sanitize removes malicious HTML/XSS while preserving safe content
        return DOMPurify.sanitize(value, {
            ALLOWED_TAGS: [], // Remove all HTML tags - pure text only
            ALLOWED_ATTR: [], // Remove all attributes
            KEEP_CONTENT: true, // Keep the text content
        });
    }

    if (Array.isArray(value)) {
        return value.map(item => sanitizeValue(item));
    }

    if (typeof value === 'object' && value !== null) {
        const sanitizedObj: any = {};
        for (const key in value) {
            if (value.hasOwnProperty(key)) {
                // Sanitize both key and value
                const sanitizedKey = DOMPurify.sanitize(key, {
                    ALLOWED_TAGS: [],
                    ALLOWED_ATTR: [],
                    KEEP_CONTENT: true,
                });
                sanitizedObj[sanitizedKey] = sanitizeValue(value[key]);
            }
        }
        return sanitizedObj;
    }

    // For numbers, booleans, null, undefined, etc. - return as is
    return value;
};

/**
 * XSS sanitization middleware
 * Sanitizes req.body, req.query, and req.params
 */
export const xssSanitizer = () => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            // Sanitize request body
            if (req.body) {
                req.body = sanitizeValue(req.body);
            }

            // Sanitize query parameters
            if (req.query) {
                req.query = sanitizeValue(req.query);
            }

            // Sanitize route parameters
            if (req.params) {
                req.params = sanitizeValue(req.params);
            }

            next();
        } catch (error) {
            // Fail-closed: if sanitization throws, reject the request rather than
            // forwarding unsanitized data. Forwarding would be fail-open and could
            // allow malicious payloads to reach downstream handlers.
            logger.error('XSS sanitization error', error);
            res.status(400).json({
                success: false,
                message: 'Request contains invalid content',
            });
            // Do NOT call next() — unsanitized data must never reach route handlers
        }
    };
};

export default xssSanitizer;
