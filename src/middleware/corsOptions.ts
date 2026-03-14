import cors from 'cors';
import logger from '../utils/logger.js';

const getAllowedOrigins = (): string[] => {
    if (process.env.NODE_ENV !== 'production') {
        return ['http://localhost:3000', 'http://127.0.0.1:3000'];
    }

    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
        logger.warn('FRONTEND_URL is not set in production — CORS will reject all cross-origin requests');
        return [];
    }

    try {
        // .origin strips any trailing path/query — intentional: CORS must match origin only
        return [new URL(frontendUrl).origin];
    } catch {
        logger.warn(`FRONTEND_URL is not a valid URL ("${frontendUrl}") — CORS will reject all cross-origin requests`);
        return [];
    }
};

// getAllowedOrigins() is evaluated once at module load time.
// This is intentional: FRONTEND_URL is a static deploy-time env var.
// If dynamic CORS updates are ever needed, change origin to a function: (origin, cb) => ...
const corsOptions = {
    credentials: true,
    origin: getAllowedOrigins(),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
};

export default cors(corsOptions);
