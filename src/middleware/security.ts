import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';

/**
 * Configure Helmet for security headers
 */
export const configureHelmet = () => {
    return helmet({
        // Content Security Policy
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
                scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'", 'https:'],
                fontSrc: ["'self'", 'https:', 'data:'],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
                frameAncestors: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
            },
        },

        // HTTP Strict Transport Security
        hsts: {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
        },

        // Hide X-Powered-By header
        hidePoweredBy: true,

        // X-Content-Type-Options
        noSniff: true,

        // X-Frame-Options
        frameguard: { action: 'deny' },

        // X-XSS-Protection
        xssFilter: true,

        // Referrer Policy
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

        // Note: expectCt deprecated in newer helmet versions

        // Permissions Policy (Feature Policy)
        permittedCrossDomainPolicies: false,
    });
};

/**
 * HTTPS enforcement middleware with proper redirect handling
 */
export const enforceHTTPS = (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'production') {
        // Check if request is already HTTPS
        const isSecure = req.secure || false;
        const isForwardedHttps = req.headers['x-forwarded-proto'] === 'https';
        const isForwardedSsl = req.headers['x-forwarded-ssl'] === 'on';
        const isHttps = isSecure || isForwardedHttps || isForwardedSsl;

        if (!isHttps) {
            const host = req.get('host');

            if (!host) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid request - missing host header',
                });
            }

            // Validate host header to prevent redirect attacks
            const validHostPattern = /^[a-zA-Z0-9.-]+(:\d+)?$/;
            if (!validHostPattern.test(host)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid host header format',
                });
            }

            // Additional security checks for redirect prevention
            // 1. Validate host format more strictly
            const strictHostPattern =
                /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*(:[0-9]{1,5})?$/;
            if (!strictHostPattern.test(host)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid host header format',
                });
            }

            // 2. Check for suspicious patterns in host and URL
            const suspiciousPatterns = [
                /[<>"'&]/g, // HTML entities
                /javascript:/gi, // JavaScript protocol
                /data:/gi, // Data protocol
                /vbscript:/gi, // VBScript protocol
                /on\w+\s*=/gi, // Event handlers
                /<script/gi, // Script tags
                /\\/g, // Backslashes
                /\.\./g, // Path traversal
            ];

            const hasSuspiciousContent = suspiciousPatterns.some(
                pattern => pattern.test(host) || pattern.test(req.originalUrl)
            );

            if (hasSuspiciousContent) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid request parameters',
                });
            }

            // 3. Validate URL path to prevent path traversal
            const urlPath = req.originalUrl.split('?')[0]; // Remove query parameters
            if (urlPath.includes('..') || urlPath.includes('\\')) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid URL path',
                });
            }

            // 4. Only allow redirects to the same host (prevent open redirects)
            const requestHost = req.get('host');
            if (requestHost && host !== requestHost) {
                return res.status(400).json({
                    success: false,
                    message: 'Host mismatch',
                });
            }

            // 5. Build redirect URL with additional validation
            const sanitizedPath = urlPath.replace(/[^\w\-\.\/]/g, ''); // Only allow safe characters
            const redirectURL = `https://${host}${sanitizedPath}`;

            // 6. Final validation of the complete redirect URL
            try {
                const url = new URL(redirectURL);
                if (url.protocol !== 'https:' || url.hostname !== host.split(':')[0]) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid redirect URL',
                    });
                }
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid redirect URL format',
                });
            }

            return res.redirect(302, redirectURL);
        }
    }

    // Allow HTTPS requests or non-production environments
    return next();
};

/**
 * Advanced rate limiting for different endpoints
 */
export const createAdvancedRateLimit = (options: {
    windowMs?: number;
    max?: number;
    message?: string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
    keyGenerator?: (req: Request) => string;
}) => {
    return rateLimit({
        windowMs: options.windowMs ?? 15 * 60 * 1000, // 15 minutes
        max: options.max ?? 100,
        message: {
            success: false,
            message: options.message ?? 'Too many requests from this IP, please try again later.',
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
        skipFailedRequests: options.skipFailedRequests ?? false,
        keyGenerator: options.keyGenerator ?? ((req: Request) => req.ip ?? 'unknown'),
        handler: (_req: Request, res: Response) => {
            res.status(429).json({
                success: false,
                message: options.message ?? 'Rate limit exceeded',
                retryAfter: Math.round((options.windowMs ?? 15 * 60 * 1000) / 1000),
            });
        },
    });
};

/**
 * IP-based rate limiting with different limits for different user types
 */
export const smartRateLimit = createAdvancedRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Fixed number for now, can be made dynamic later
    keyGenerator: (req: Request) => {
        // Use user ID if authenticated, otherwise IP
        return req.user ? `user:${req.user._id}` : `ip:${req.ip}`;
    },
});

/**
 * Suspicious activity detection middleware
 */
export const detectSuspiciousActivity = (req: Request, res: Response, next: NextFunction) => {
    // Skip security checks for authentication endpoints only
    // Use exact path matching to prevent bypass vulnerabilities
    const authEndpoints = ['/register', '/login', '/reset-password'];
    const isAuthEndpoint = authEndpoints.some(endpoint => req.path === endpoint || req.path.endsWith(endpoint));

    if (isAuthEndpoint) {
        return next();
    }

    const suspiciousPatterns = [
        // SQL injection patterns - safer regex without nested quantifiers
        /\b(union|select|insert|update|delete|drop|create|alter|exec|script)\b/i,
        // XSS patterns - safer regex without nested quantifiers
        /<script[^>]*>[^<]*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        // Path traversal
        /\.\.\//g,
        /\.\.\\/g,
        // Command injection - detect common command injection patterns
        /[;&|`$()]/g, // Flag any command injection special chars
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
        // Log suspicious activity
        console.warn(`Suspicious activity detected from IP: ${req.ip}`, {
            method: req.method,
            url: req.url,
            userAgent: req.get('User-Agent'),
            body: req.body,
            query: req.query,
            params: req.params,
        });

        return res.status(400).json({
            success: false,
            message: 'Suspicious request detected',
        });
    }

    return next();
};

/**
 * Request size limiting middleware
 */
export const limitRequestSize = (maxSize: number = 1024 * 1024) => {
    // 1MB default
    return (req: Request, res: Response, next: NextFunction) => {
        const contentLength = req.get('content-length');

        if (contentLength && parseInt(contentLength) > maxSize) {
            return res.status(413).json({
                success: false,
                message: 'Request entity too large',
                maxSize: `${maxSize / 1024 / 1024}MB`,
            });
        }

        return next();
    };
};

/**
 * User-Agent validation middleware
 */
export const validateUserAgent = (req: Request, res: Response, next: NextFunction) => {
    const userAgent = req.get('User-Agent');

    if (!userAgent) {
        return res.status(400).json({
            success: false,
            message: 'User-Agent header is required',
        });
    }

    // Block known malicious user agents
    const blockedUserAgents = [
        /sqlmap/i,
        /nikto/i,
        /netsparker/i,
        /acunetix/i,
        /nessus/i,
        /openvas/i,
        /masscan/i,
        /nmap/i,
    ];

    if (blockedUserAgents.some(pattern => pattern.test(userAgent))) {
        return res.status(403).json({
            success: false,
            message: 'Blocked user agent',
        });
    }

    return next();
};

/**
 * Geo-blocking middleware (basic implementation)
 */
export const geoBlock = (blockedCountries: string[] = []) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const country = req.get('CF-IPCountry') ?? req.get('X-Country-Code');

        if (country && blockedCountries.includes(country.toUpperCase())) {
            return res.status(403).json({
                success: false,
                message: 'Access denied from your location',
            });
        }

        return next();
    };
};

/**
 * API versioning middleware
 */
export const requireAPIVersion = (supportedVersions: string[] = ['v1']) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const version = (req.headers['api-version'] as string) ?? (req.query.version as string) ?? 'v1'; // default version

        if (!supportedVersions.includes(version)) {
            return res.status(400).json({
                success: false,
                message: 'Unsupported API version',
                supportedVersions,
            });
        }

        req.apiVersion = version;
        return next();
    };
};

/**
 * Request correlation ID middleware for tracing
 */
export const addCorrelationId = (req: Request, res: Response, next: NextFunction) => {
    const correlationId =
        req.get('X-Correlation-ID') ?? req.get('X-Request-ID') ?? `req-${Date.now()}-${randomUUID().substring(0, 8)}`;

    req.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);

    return next();
};

// Type augmentation for Request interface
declare global {
    namespace Express {
        interface Request {
            apiVersion?: string;
            correlationId?: string;
        }
    }
}
