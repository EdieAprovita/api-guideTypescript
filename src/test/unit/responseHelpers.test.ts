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
    it('sends paginated data with pagination and 200 status', () => {
        const res = createMockResponse();
        const data = [{ id: '1' }, { id: '2' }];
        const pagination: PaginationMeta = {
            currentPage: 1,
            totalPages: 1,
            totalItems: 2,
            itemsPerPage: 10,
            hasNextPage: false,
            hasPrevPage: false,
        };

        sendPaginatedResponse(res, data, pagination);

        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.OK);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Resources fetched successfully',
            data,
            pagination,
        });
    });

    it('accepts custom message and status code', () => {
        const res = createMockResponse();
        const data = [{ name: 'test' }];
        const pagination: PaginationMeta = {
            currentPage: 2,
            totalPages: 3,
            totalItems: 12,
            itemsPerPage: 5,
            hasNextPage: true,
            hasPrevPage: true,
        };

        sendPaginatedResponse(res, data, pagination, 'Custom message', 201);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Custom message',
                pagination,
            })
        );
    });

    it('returns empty array with correct pagination for empty results', () => {
        const res = createMockResponse();
        const pagination: PaginationMeta = {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: 10,
            hasNextPage: false,
            hasPrevPage: false,
        };

        sendPaginatedResponse(res, [], pagination);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                data: [],
                pagination,
            })
        );
    });
});

describe('sendSuccessResponse (backward compat)', () => {
    it('does NOT include pagination field when called without it', () => {
        const res = createMockResponse();
        sendSuccessResponse(res, { id: '1' });

        const jsonArg = (res.json as any).mock.calls[0][0];
        expect(jsonArg).not.toHaveProperty('pagination');
        expect(jsonArg.success).toBe(true);
    });
});
