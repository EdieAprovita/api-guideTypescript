import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { responseWrapper } from '../../middleware/responseWrapper.js';
import type { PaginationMeta } from '../../types/pagination.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use(responseWrapper);
    return app;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const samplePagination: PaginationMeta = {
    currentPage: 2,
    totalPages: 5,
    totalItems: 50,
    itemsPerPage: 10,
    hasNextPage: true,
    hasPrevPage: true,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('responseWrapper middleware', () => {
    describe('standard (non-paginated) response', () => {
        it('wraps a plain object in { success, data }', async () => {
            const app = buildApp();
            app.get('/plain', (_req, res) => {
                res.json({ name: 'test' });
            });

            const response = await request(app).get('/plain');
            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                success: true,
                data: { name: 'test' },
            });
            expect(response.body).not.toHaveProperty('pagination');
            expect(response.body).not.toHaveProperty('meta');
        });

        it('passes through already-wrapped bodies untouched', async () => {
            const app = buildApp();
            app.get('/pre-wrapped', (_req, res) => {
                res.json({ success: true, data: { id: 1 } });
            });

            const response = await request(app).get('/pre-wrapped');
            // Should not double-wrap
            expect(response.body).toEqual({ success: true, data: { id: 1 } });
        });

        it('does not wrap 4xx responses', async () => {
            const app = buildApp();
            app.get('/bad', (_req, res) => {
                res.status(400).json({ success: false, message: 'bad input' });
            });

            const response = await request(app).get('/bad');
            expect(response.status).toBe(400);
            expect(response.body).toEqual({ success: false, message: 'bad input' });
        });
    });

    describe('dual-format for paginated responses', () => {
        it('emits both pagination and deprecated meta simultaneously', async () => {
            const app = buildApp();
            app.get('/paginated', (_req, res) => {
                res.json({
                    data: [{ id: '1' }, { id: '2' }],
                    pagination: samplePagination,
                });
            });

            const response = await request(app).get('/paginated');
            expect(response.status).toBe(200);

            // New canonical shape
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual([{ id: '1' }, { id: '2' }]);
            expect(response.body.pagination).toMatchObject({
                currentPage: 2,
                totalPages: 5,
                totalItems: 50,
                itemsPerPage: 10,
                hasNextPage: true,
                hasPrevPage: true,
            });

            // Deprecated legacy meta — must coexist for frontend on main branch
            expect(response.body.meta).toMatchObject({
                page: samplePagination.currentPage,
                limit: samplePagination.itemsPerPage,
                total: samplePagination.totalItems,
                pages: samplePagination.totalPages,
            });
        });

        it('meta.page matches pagination.currentPage', async () => {
            const app = buildApp();
            app.get('/page-sync', (_req, res) => {
                res.json({ data: [], pagination: samplePagination });
            });

            const { body } = await request(app).get('/page-sync');
            expect(body.meta.page).toBe(body.pagination.currentPage);
        });

        it('meta.total matches pagination.totalItems', async () => {
            const app = buildApp();
            app.get('/total-sync', (_req, res) => {
                res.json({ data: [], pagination: samplePagination });
            });

            const { body } = await request(app).get('/total-sync');
            expect(body.meta.total).toBe(body.pagination.totalItems);
        });

        it('meta.pages matches pagination.totalPages', async () => {
            const app = buildApp();
            app.get('/pages-sync', (_req, res) => {
                res.json({ data: [], pagination: samplePagination });
            });

            const { body } = await request(app).get('/pages-sync');
            expect(body.meta.pages).toBe(body.pagination.totalPages);
        });

        it('handles empty data array with correct dual format', async () => {
            const emptyPagination: PaginationMeta = {
                currentPage: 1,
                totalPages: 1,
                totalItems: 0,
                itemsPerPage: 10,
                hasNextPage: false,
                hasPrevPage: false,
            };

            const app = buildApp();
            app.get('/empty', (_req, res) => {
                res.json({ data: [], pagination: emptyPagination });
            });

            const { body } = await request(app).get('/empty');
            expect(body.data).toEqual([]);
            expect(body.pagination.totalItems).toBe(0);
            expect(body.meta.total).toBe(0);
            expect(body.meta.page).toBe(1);
        });
    });
});
