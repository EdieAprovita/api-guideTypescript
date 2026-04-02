import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { trace } from '@opentelemetry/api';

const SENSITIVE_KEYS = new Set([
    'token',
    'accesstoken',
    'refreshtoken',
    'password',
    'newpassword',
    'currentpassword',
    'confirmpassword',
    'secret',
    'apikey',
    'api_key',
    'authorization',
    'key',
    'cookie',
    'cookies',
    'session',
    'sessionid',
    'session_id',
]);

function sanitizeForLog(obj: unknown, depth: number = 0): unknown {
    if (obj === null || obj === undefined) return obj;
    if (depth > 5) return '[TRUNCATED]';
    if (Array.isArray(obj)) return obj.map(item => sanitizeForLog(item, depth + 1));
    if (typeof obj === 'object') {
        const result: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj)) {
            result[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : sanitizeForLog(v, depth + 1);
        }
        return result;
    }
    return obj;
}

/**
 * @description Middleware to log requests with a correlation ID
 * Adds a unique correlation ID to each request and logs entry/exit
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    // Use the correlation ID already set by addCorrelationId (security.ts),
    // falling back to header or a new UUID for resilience.
    const correlationId: string =
        req.correlationId || req.get('X-Correlation-ID') || req.get('X-Request-ID') || uuidv4();
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);

    // Propagate correlation ID onto the active OTel span (no-op when OTel is inactive)
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
        activeSpan.setAttribute('correlation.id', correlationId);
    }

    // Log entry
    const startTime = Date.now();
    logger.debug(`[${correlationId}] Incoming ${req.method} ${req.path}`, {
        correlationId,
        method: req.method,
        path: req.path,
        query: Object.keys(req.query).length > 0 ? sanitizeForLog(req.query) : undefined,
        ip: req.ip,
        userAgent: req.get('user-agent'),
    });

    // Intercept response
    const originalSend = res.send;
    res.send = function (data: any) {
        const duration = Date.now() - startTime;

        // Log exit
        if (res.statusCode >= 400) {
            logger.warn(`[${correlationId}] Outgoing ${req.method} ${req.path} - ${res.statusCode}`, {
                correlationId,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                method: req.method,
                path: req.path,
            });
        } else {
            logger.info(`[${correlationId}] Outgoing ${req.method} ${req.path} - ${res.statusCode}`, {
                correlationId,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                method: req.method,
                path: req.path,
            });
        }

        return originalSend.call(this, data);
    };

    next();
};

export default requestLogger;
