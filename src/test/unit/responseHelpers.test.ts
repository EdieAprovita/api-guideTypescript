import { describe, it, expect, vi } from 'vitest';
import { sendPaginatedResponse, sendSuccessResponse } from '../../utils/responseHelpers.js';
import { HttpStatusCode } from '../../types/Errors.js';
import type { Response } from 'express';
import type { PaginationMeta } from '../../types/pagination.js';

function createMockResponse(): Response {
    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    return res;
}

describe('sendPaginatedResponse', () => {
    it('sends paginated data with meta and 200 status', () => {
        const res = createMockResponse();
        const data = [{ id: '1' }, { id: '2' }];
        const meta: PaginationMeta = { page: 1, limit: 10, total: 2, pages: 1 };

        sendPaginatedResponse(res, data, meta);

        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.OK);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Resources fetched successfully',
            data,
            meta,
        });
    });

    it('accepts custom message and status code', () => {
        const res = createMockResponse();
        const data = [{ name: 'test' }];
        const meta: PaginationMeta = { page: 2, limit: 5, total: 12, pages: 3 };

        sendPaginatedResponse(res, data, meta, 'Custom message', 201);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Custom message',
                meta,
            })
        );
    });

    it('returns empty array with correct meta for empty results', () => {
        const res = createMockResponse();
        const meta: PaginationMeta = { page: 1, limit: 10, total: 0, pages: 0 };

        sendPaginatedResponse(res, [], meta);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                data: [],
                meta: { page: 1, limit: 10, total: 0, pages: 0 },
            })
        );
    });
});

describe('sendSuccessResponse (backward compat)', () => {
    it('does NOT include meta field when called without it', () => {
        const res = createMockResponse();
        sendSuccessResponse(res, { id: '1' });

        const jsonArg = (res.json as any).mock.calls[0][0];
        expect(jsonArg).not.toHaveProperty('meta');
        expect(jsonArg.success).toBe(true);
    });
});
