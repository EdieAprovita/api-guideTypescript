import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';

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

            // username and password are string (hasCreds guarantees this);
            // cast once here so Buffer.from and Buffer.byteLength are satisfied.
            const expectedUsername = username as string;
            const expectedPassword = password as string;

            const userBuf = Buffer.from(user ?? '');
            const passBuf = Buffer.from(pass ?? '');
            const expectedUserBuf = Buffer.alloc(Buffer.byteLength(expectedUsername));
            const expectedPassBuf = Buffer.alloc(Buffer.byteLength(expectedPassword));
            Buffer.from(expectedUsername).copy(expectedUserBuf);
            Buffer.from(expectedPassword).copy(expectedPassBuf);

            const userMatch = userBuf.length === expectedUserBuf.length && timingSafeEqual(userBuf, expectedUserBuf);
            const passMatch = passBuf.length === expectedPassBuf.length && timingSafeEqual(passBuf, expectedPassBuf);

            if (userMatch && passMatch) {
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
