import { Request, Response, NextFunction } from 'express';

/**
 * @description Middleware to standardize API responses
 * Wraps successful responses in a { success: true, data, meta? } structure
 */
export const responseWrapper = (_req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;

    res.json = function (body: any) {
        // Skip wrapping if:
        // 1. Response is already wrapped (has success property)
        // 2. Response is an error (status code >= 400) - handled by errorHandler
        // 3. Body is null or undefined
        if (
            (body && typeof body === 'object' && 'success' in body) ||
            res.statusCode >= 400 ||
            body === null ||
            body === undefined
        ) {
            return originalJson.call(this, body);
        }

        // Handle paginated responses from services
        // These already have { data, pagination } structure
        if (body && typeof body === 'object' && 'data' in body && 'pagination' in body) {
            return originalJson.call(this, {
                success: true,
                data: body.data,
                pagination: body.pagination,
            });
        }

        // Standard wrap for everything else
        return originalJson.call(this, {
            success: true,
            data: body,
        });
    };

    next();
};

export default responseWrapper;
