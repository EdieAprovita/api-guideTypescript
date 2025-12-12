import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response } from 'express';
import { BaseController } from '@/controllers/BaseController';
import type BaseService from '@/services/BaseService';
import type { Document } from 'mongoose';
import { testUtils } from '@test/helpers/testBase';
import { HttpStatusCode } from '@/types/Errors';

const mockValidationResult = vi.fn();

vi.mock('express-validator', () => ({
    __esModule: true,
    default: {
        validationResult: (...args: any[]) => mockValidationResult(...args),
    },
    validationResult: (...args: any[]) => mockValidationResult(...args),
}));

describe('BaseController', () => {
    let controller: BaseController<Document>;
    let service: {
        getAll: ReturnType<typeof vi.fn>;
        findById: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        updateById: ReturnType<typeof vi.fn>;
        deleteById: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        service = {
            getAll: vi.fn().mockResolvedValue([{ id: '1' }]),
            findById: vi.fn().mockResolvedValue({ id: '1' }),
            create: vi.fn().mockResolvedValue({ id: '1' }),
            updateById: vi.fn().mockResolvedValue({ id: '1' }),
            deleteById: vi.fn().mockResolvedValue(undefined),
        };
        controller = new BaseController<Document>(service as unknown as BaseService<Document>);
        // Reset and set default mock behavior
        mockValidationResult.mockReturnValue({
            isEmpty: () => true,
            array: () => [],
            formatWith: vi.fn(),
            throw: vi.fn(),
            mapped: vi.fn(),
        } as any);
    });

    it('getAll should respond with resources', async () => {
        const req = testUtils.createMockRequest() as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext();

        await controller.getAll(req, res, next);

        expect(service.getAll).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.OK);
        expect(next).not.toHaveBeenCalled();
    });

    it('getAll should forward errors', async () => {
        service.getAll.mockRejectedValueOnce(new Error('fail'));
        const req = testUtils.createMockRequest() as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext();

        await controller.getAll(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it('getById should fetch resource', async () => {
        const req = testUtils.createMockRequest({ params: { id: '1' } }) as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext();

        await controller.getById(req, res, next);

        expect(service.findById).toHaveBeenCalledWith('1');
        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.OK);
        expect(next).not.toHaveBeenCalled();
    });

    it('create should return created resource', async () => {
        mockValidationResult.mockReturnValue({
            isEmpty: () => true,
            array: () => [],
            formatWith: vi.fn(),
            throw: vi.fn(),
            mapped: vi.fn(),
        } as any);
        const req = testUtils.createMockRequest({ body: { name: 'test' } }) as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext();

        await controller.create(req, res, next);

        expect(service.create).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.CREATED);
        expect(next).not.toHaveBeenCalled();
    });

    it('create should handle validation errors', async () => {
        mockValidationResult.mockReturnValue({
            isEmpty: () => false,
            array: () => [
                {
                    type: 'field' as const,
                    location: 'body' as const,
                    path: 'name',
                    value: undefined,
                    msg: 'Invalid',
                },
            ],
            formatWith: vi.fn(),
            throw: vi.fn(),
            mapped: vi.fn(),
        } as any);
        const req = testUtils.createMockRequest({ body: {} }) as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext();

        await controller.create(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(service.create).not.toHaveBeenCalled();
    });

    it('delete should remove resource', async () => {
        const req = testUtils.createMockRequest({ params: { id: '1' } }) as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext();

        await controller.delete(req, res, next);

        expect(service.deleteById).toHaveBeenCalledWith('1');
        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.OK);
        expect(next).not.toHaveBeenCalled();
    });

    // Additional tests to improve coverage for uncovered lines (86-97, 107-108)
    it('update should update resource successfully', async () => {
        mockValidationResult.mockReturnValue({
            isEmpty: () => true,
            array: () => [],
            formatWith: vi.fn(),
            throw: vi.fn(),
            mapped: vi.fn(),
        } as any);
        const req = testUtils.createMockRequest({
            params: { id: '1' },
            body: { name: 'updated' },
        }) as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext();

        await controller.update(req, res, next);

        expect(service.updateById).toHaveBeenCalledWith('1', { name: 'updated' });
        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.OK);
        expect(next).not.toHaveBeenCalled();
    });

    it('update should handle validation errors', async () => {
        mockValidationResult.mockReturnValue({
            isEmpty: () => false,
            array: () => [
                {
                    type: 'field' as const,
                    location: 'body' as const,
                    path: 'name',
                    value: undefined,
                    msg: 'Invalid data',
                },
            ],
            formatWith: vi.fn(),
            throw: vi.fn(),
            mapped: vi.fn(),
        } as any);
        const req = testUtils.createMockRequest({
            params: { id: '1' },
            body: {},
        }) as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext();

        await controller.update(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(service.updateById).not.toHaveBeenCalled();
    });

    it('update should handle resource not found', async () => {
        mockValidationResult.mockReturnValue({
            isEmpty: () => true,
            array: () => [],
            formatWith: vi.fn(),
            throw: vi.fn(),
            mapped: vi.fn(),
        } as any);
        service.updateById.mockResolvedValueOnce(null);
        const req = testUtils.createMockRequest({
            params: { id: '999' },
            body: { name: 'updated' },
        }) as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext();

        await controller.update(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(service.updateById).toHaveBeenCalledWith('999', { name: 'updated' });
    });

    it('update should forward service errors', async () => {
        mockValidationResult.mockReturnValue({
            isEmpty: () => true,
            array: () => [],
            formatWith: vi.fn(),
            throw: vi.fn(),
            mapped: vi.fn(),
        } as any);
        service.updateById.mockRejectedValueOnce(new Error('Service error'));
        const req = testUtils.createMockRequest({
            params: { id: '1' },
            body: { name: 'updated' },
        }) as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext();

        await controller.update(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it('delete should forward service errors', async () => {
        service.deleteById.mockRejectedValueOnce(new Error('Delete failed'));
        const req = testUtils.createMockRequest({ params: { id: '1' } }) as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext();

        await controller.delete(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(service.deleteById).toHaveBeenCalledWith('1');
    });

    it('getById should handle invalid id parameter', async () => {
        const req = testUtils.createMockRequest({ params: {} }) as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext();

        await controller.getById(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(service.findById).not.toHaveBeenCalled();
    });

    it('update should handle invalid id parameter', async () => {
        const req = testUtils.createMockRequest({ params: {}, body: { name: 'test' } }) as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext();

        await controller.update(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(service.updateById).not.toHaveBeenCalled();
    });

    it('delete should handle invalid id parameter', async () => {
        const req = testUtils.createMockRequest({ params: {} }) as Request;
        const res = testUtils.createMockResponse() as Response;
        const next = testUtils.createMockNext();

        await controller.delete(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(service.deleteById).not.toHaveBeenCalled();
    });
});
