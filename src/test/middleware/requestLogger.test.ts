import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import requestLogger from '../../middleware/requestLogger.js';
import { addCorrelationId } from '../../middleware/security.js';

const setAttribute = vi.fn();

vi.mock('../../utils/logger', () => ({
    default: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('@opentelemetry/api', () => ({
    trace: {
        getActiveSpan: vi.fn(() => ({
            setAttribute,
        })),
    },
}));

const app = express();
app.use(express.json());
app.use(addCorrelationId);
app.use(requestLogger);
app.get('/request-id', (_req, res) => {
    res.status(200).json({ ok: true });
});

describe('requestLogger', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('propagates X-Request-ID into X-Correlation-ID and the active span', async () => {
        const response = await request(app).get('/request-id').set('X-Request-ID', 'request-id-123').expect(200);

        expect(response.headers['x-correlation-id']).toBe('request-id-123');
        expect(setAttribute).toHaveBeenCalledWith('correlation.id', 'request-id-123');
    });

    it('preserves an incoming X-Correlation-ID', async () => {
        const response = await request(app)
            .get('/request-id')
            .set('X-Correlation-ID', 'correlation-id-abc')
            .expect(200);

        expect(response.headers['x-correlation-id']).toBe('correlation-id-abc');
        expect(setAttribute).toHaveBeenCalledWith('correlation.id', 'correlation-id-abc');
    });
});
