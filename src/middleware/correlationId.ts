import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Middleware that ensures every request has a correlation ID for end-to-end tracing.
 *
 * 1. Reads an incoming `X-Correlation-ID` header (set by API gateways, upstream services, or clients).
 * 2. Falls back to a new v4 UUID when the header is absent.
 * 3. Stores the ID in `res.locals.correlationId` so downstream middleware and handlers can reference it.
 * 4. Echoes the ID back in the response headers for client-side correlation.
 */
export function correlationId(req: Request, res: Response, next: NextFunction): void {
    const id = (req.get('X-Correlation-ID') as string | undefined) || randomUUID();

    res.locals.correlationId = id;
    res.setHeader('X-Correlation-ID', id);

    next();
}
