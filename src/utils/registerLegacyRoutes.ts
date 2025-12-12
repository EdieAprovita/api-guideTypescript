import { Router, RequestHandler } from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';

/**
 * Register deprecated action routes on the given router.
 * These legacy routes are kept for compatibility and will be
 * removed in the next major version.
 */
export function registerLegacyRoutes(
    router: Router,
    handlers: {
        create: RequestHandler;
        update: RequestHandler;
        remove: RequestHandler;
    }
) {
    router.post('/create', protect, handlers.create);
    router.put('/update/:id', protect, admin, handlers.update);
    router.delete('/delete/:id', protect, admin, handlers.remove);
}
