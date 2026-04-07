/**
 * Real Rate-Limit Integration Tests
 *
 * Validates that the express-rate-limit middleware enforces 429 responses after
 * exhausting the allowed request window.
 *
 * Because the global integration-setup.ts mocks express-rate-limit to keep the
 * other fast suites stable, these tests instantiate a minimal express app that
 * imports and wires rateLimit() directly from the real module — bypassing the
 * vi.mock() that Vitest hoists over the main app import.
 *
 * This pattern is intentional: we test the rate-limiter library behaviour in
 * isolation, which is more reliable and faster than hitting the full stack.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express, { type Request, type Response, type NextFunction } from 'express';
import { createServer, type Server } from 'http';

// ---------------------------------------------------------------------------
// Build a minimal test app with a real rate-limiter
// We use vi.importActual to obtain the real module even when vi.mock is active.
// ---------------------------------------------------------------------------

type RateLimitFn = (options: {
    windowMs: number;
    max: number;
    standardHeaders: boolean;
    legacyHeaders: boolean;
    handler: (req: Request, res: Response) => void;
    keyGenerator: (req: Request) => string;
}) => (req: Request, res: Response, next: NextFunction) => void;

type RateLimitModule = { default: RateLimitFn };

/**
 * Returns a supertest-compatible HTTP server that applies a real (unmocked)
 * rate-limiter configured with the given window and max values.
 *
 * The server responds 200 on GET /ping for every non-rate-limited request.
 */
const buildRateLimitedServer = async (windowMs: number, max: number): Promise<Server> => {
    const { default: rateLimit } = (await vi.importActual('express-rate-limit')) as RateLimitModule;

    const app = express();
    app.set('trust proxy', 'loopback');

    const limiter = rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req: Request) => req.ip ?? 'unknown',
        handler: (_req: Request, res: Response) => {
            res.status(429).json({ success: false, message: 'Rate limit exceeded' });
        },
    });

    app.get('/ping', limiter, (_req: Request, res: Response) => {
        res.status(200).json({ success: true });
    });

    return createServer(app);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Real Rate-Limit Middleware — express-rate-limit', () => {
    it('returns 429 after exhausting the configured request limit', async () => {
        // Use a very short window so the test does not have to wait
        const server = await buildRateLimitedServer(2000, 3);

        const statuses: number[] = [];
        for (let i = 0; i < 5; i++) {
            const res = await request(server).get('/ping').set('X-Forwarded-For', '10.1.1.1');
            statuses.push(res.status);
        }

        // First 3 requests should pass through
        expect(statuses[0]).toBe(200);
        expect(statuses[1]).toBe(200);
        expect(statuses[2]).toBe(200);

        // 4th and 5th requests must be rate-limited
        expect(statuses[3]).toBe(429);
        expect(statuses[4]).toBe(429);
    }, 15_000);

    it('returns 429 body with success:false and message when rate limit is hit', async () => {
        const server = await buildRateLimitedServer(2000, 2);

        // Exhaust the limit
        await request(server).get('/ping').set('X-Forwarded-For', '10.2.2.2');
        await request(server).get('/ping').set('X-Forwarded-For', '10.2.2.2');

        // This one should be rate-limited
        const res = await request(server).get('/ping').set('X-Forwarded-For', '10.2.2.2');

        expect(res.status).toBe(429);
        expect(res.body).toMatchObject({ success: false });
        expect(typeof res.body.message).toBe('string');
    }, 15_000);

    it('different IPs have independent counters', async () => {
        const server = await buildRateLimitedServer(2000, 2);

        // Exhaust limit for IP A
        await request(server).get('/ping').set('X-Forwarded-For', '10.3.3.1');
        await request(server).get('/ping').set('X-Forwarded-For', '10.3.3.1');
        const rateLimitedA = await request(server).get('/ping').set('X-Forwarded-For', '10.3.3.1');

        // IP B should still have its own fresh counter
        const freshB = await request(server).get('/ping').set('X-Forwarded-For', '10.3.3.2');

        expect(rateLimitedA.status).toBe(429);
        expect(freshB.status).toBe(200);
    }, 15_000);
});
