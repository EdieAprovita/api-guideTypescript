import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * @description Middleware to log requests with a correlation ID
 * Adds a unique correlation ID to each request and logs entry/exit
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    // Generate or use existing correlation ID
    const correlationId = req.get('X-Correlation-ID') || uuidv4();
    (req as any).correlationId = correlationId;

    // Save correlation ID in response headers
    res.setHeader('X-Correlation-ID', correlationId);

    // Log entry
    const startTime = Date.now();
    logger.debug(`[${correlationId}] Incoming ${req.method} ${req.path}`, {
        correlationId,
        method: req.method,
        path: req.path,
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
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
