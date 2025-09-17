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
                // In production, avoid allowing inline styles. During local/dev, allow inline for DX.
                styleSrc:
                    process.env.NODE_ENV === 'production'
                        ? ["'self'", 'https:']
                        : ["'self'", "'unsafe-inline'", 'https:'],
                // In production, do not allow inline scripts or eval to reduce XSS risk.
                scriptSrc:
                    process.env.NODE_ENV === 'production' ? ["'self'"] : ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
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
 * HTTPS enforcement middleware without user-controlled redirects
 */
export const enforceHTTPS = (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'production') {
        // Check if request is already HTTPS
        const isSecure = req.secure || false;
        const isForwardedHttps = req.headers['x-forwarded-proto'] === 'https';
        const isForwardedSsl = req.headers['x-forwarded-ssl'] === 'on';
        const isHttps = isSecure || isForwardedHttps || isForwardedSsl;

        if (!isHttps) {
            // Instead of redirecting based on user input, return an error
            // or redirect to a predefined secure URL
            const secureBaseUrl = process.env.SECURE_BASE_URL || 'https://localhost';

            // Build redirect URL using only trusted environment variables
            // Don't include user-controlled path to prevent open redirect attacks
            const redirectURL = secureBaseUrl;

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
        // Enhanced key generator for proxy environments
        keyGenerator:
            options.keyGenerator ??
            ((req: Request) => {
                // req.ip should now work correctly with trust proxy configuration
                const clientIP =
                    req.ip ||
                    req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
                    req.headers['x-real-ip']?.toString() ||
                    req.connection?.remoteAddress ||
                    'unknown';
                return clientIP;
            }),
        handler: (req: Request, res: Response) => {
            // Log rate limit violations with better IP tracking
            console.warn(
                `Rate limit exceeded for IP: ${req.ip}, X-Forwarded-For: ${req.headers['x-forwarded-for']}, User-Agent: ${req.headers['user-agent']}`
            );

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
        // Use user ID if authenticated, otherwise use enhanced IP detection
        if (req.user) {
            return `user:${req.user._id}`;
        }

        // Enhanced IP detection for unauthenticated users
        const clientIP =
            req.ip ||
            req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
            req.headers['x-real-ip']?.toString() ||
            req.connection?.remoteAddress ||
            'unknown';
        return `ip:${clientIP}`;
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

    const isSuspicious = Boolean(checkValue(req.body) || checkValue(req.query) || checkValue(req.params));

    if (isSuspicious) {
        // Log metadata only to avoid leaking sensitive payloads
        const logDetails = {
            method: req.method,
            url: req.url,
            userAgent: req.get('User-Agent'),
            bodyKeys: typeof req.body === 'object' && req.body !== null ? Object.keys(req.body) : undefined,
            queryKeys: typeof req.query === 'object' && req.query !== null ? Object.keys(req.query) : undefined,
            paramKeys: typeof req.params === 'object' && req.params !== null ? Object.keys(req.params) : undefined,
        };
        console.warn(`Suspicious activity detected from IP: ${req.ip}`, logDetails);

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
        const numericLength = contentLength ? parseInt(contentLength) : undefined;
        const computedBodySize = req.body ? Buffer.byteLength(JSON.stringify(req.body)) : 0;

        if ((numericLength && numericLength > maxSize) || computedBodySize > maxSize) {
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

/**
 * Utility function to get and log client IP information for debugging
 * Useful for monitoring IP detection in production environments
 */
export const getClientIPInfo = (req: Request) => {
    const ipInfo = {
        expressIP: req.ip,
        xForwardedFor: req.headers['x-forwarded-for'],
        xRealIP: req.headers['x-real-ip'],
        connectionRemoteAddress: req.connection?.remoteAddress,
        socketRemoteAddress: (req.socket as any)?.remoteAddress,
        xForwardedProto: req.headers['x-forwarded-proto'],
        userAgent: req.headers['user-agent'],
    };

    // In development, log IP info for debugging
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_IP_INFO === 'true') {
        console.log('🔍 Client IP Debug Info:', ipInfo);
    }

    return ipInfo;
};

/**
 * Middleware to debug IP information (only enable when needed)
 */
export const debugIPInfo = (req: Request, _res: Response, next: NextFunction) => {
    if (process.env.DEBUG_IP_INFO === 'true') {
        getClientIPInfo(req);
    }
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
