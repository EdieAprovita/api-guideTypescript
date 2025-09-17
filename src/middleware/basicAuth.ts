import { Request, Response, NextFunction } from 'express';

/**
 * Basic Auth middleware for protecting Swagger UI (or any route)
 * - Enabled only if SWAGGER_AUTH_USER and SWAGGER_AUTH_PASS are set
 * - In production, when used for /api-docs, pair with ENABLE_SWAGGER_UI=true
 */
export const basicAuth = () => {
    const username = process.env.SWAGGER_AUTH_USER;
    const password = process.env.SWAGGER_AUTH_PASS;

    const hasCreds = Boolean(username && password);

    return (req: Request, res: Response, next: NextFunction) => {
        // If no credentials configured, allow through (useful for dev)
        if (!hasCreds) return next();

        const header = req.headers.authorization || '';
        if (!header.startsWith('Basic ')) {
            res.setHeader('WWW-Authenticate', 'Basic realm="API Docs"');
            return res.status(401).send('Authentication required');
        }

        try {
            const base64 = header.replace('Basic ', '');
            const decoded = Buffer.from(base64, 'base64').toString('utf8');
            const [user, pass] = decoded.split(':');

            if (user === username && pass === password) {
                return next();
            }
        } catch {
            // fallthrough to unauthorized
        }

        res.setHeader('WWW-Authenticate', 'Basic realm="API Docs"');
        return res.status(401).send('Invalid credentials');
    };
};

export default basicAuth;
