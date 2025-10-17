import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';

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
    return (req: Request, _res: Response, next: NextFunction) => {
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
            console.error('XSS Sanitization Error:', error);
            // Don't fail the request, but log the error
            next();
        }
    };
};

export default xssSanitizer;
