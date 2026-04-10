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

        // Handle paginated responses from services.
        // These already have { data, pagination } structure.
        //
        // DUAL-FORMAT: emit both `pagination` (new canonical shape) and the
        // legacy `meta` alias simultaneously so the frontend currently on
        // `main` (reading meta.{total,pages,hasNext,hasPrevious}) keeps
        // working without changes.
        //
        // DEPRECATION: `meta` will be removed once the frontend PR that
        // migrates to `pagination.*` is merged and deployed.  Track removal
        // in: https://github.com/your-org/your-repo/issues/XXX
        if (body && typeof body === 'object' && 'data' in body && 'pagination' in body) {
            const { data, pagination } = body as {
                data: unknown;
                pagination: {
                    currentPage: number;
                    itemsPerPage: number;
                    totalItems: number;
                    totalPages: number;
                };
            };
            return originalJson.call(this, {
                success: true,
                data,
                pagination,
                // DEPRECATED – backwards-compat aliases for frontend on main branch.
                // Remove after frontend PR deprecating these fields is merged.
                meta: {
                    page: pagination.currentPage,
                    limit: pagination.itemsPerPage,
                    total: pagination.totalItems,
                    pages: pagination.totalPages,
                },
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
