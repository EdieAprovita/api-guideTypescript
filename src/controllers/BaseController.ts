import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { HttpError, HttpStatusCode } from '../types/Errors';
import { getErrorMessage } from '../types/modalTypes';
import { sendSuccessResponse, sendCreatedResponse, sendDeletedResponse } from '../utils/responseHelpers';
import asyncHandler from '../middleware/asyncHandler';
import BaseService from '../services/BaseService';
import { Document } from 'mongoose';
import { sanitizeNoSQLInput } from '../utils/sanitizer';

export class BaseController<T extends Document> {
    protected service: BaseService<T>;

    constructor(service: BaseService<T>) {
        this.service = service;
    }

    protected validateRequest(req: Request, next: NextFunction): boolean {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const firstError = errors.array()[0];
            next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(firstError?.msg ?? 'Validation error')));
            return false;
        }
        return true;
    }

    protected validateId(req: Request, next: NextFunction, paramName: string = 'id'): boolean {
        const id = req.params[paramName];
        if (!id) {
            next(
                new HttpError(
                    HttpStatusCode.BAD_REQUEST,
                    `${paramName.charAt(0).toUpperCase() + paramName.slice(1)} is required`
                )
            );
            return false;
        }
        return true;
    }

    protected handleError(error: unknown, next: NextFunction, defaultMessage: string = 'Operation failed'): void {
        next(
            new HttpError(
                HttpStatusCode.INTERNAL_SERVER_ERROR,
                getErrorMessage(error instanceof Error ? error.message : defaultMessage)
            )
        );
    }

    // Standard CRUD operations
    getAll = asyncHandler(async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const resources = await this.service.getAll();
            sendSuccessResponse(res, resources, 'Resources fetched successfully');
        } catch (error) {
            this.handleError(error, next, 'Failed to fetch resources');
        }
    });

    getById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        if (!this.validateId(req, next)) return;

        try {
            const resource = await this.service.findById(req.params.id!);
            if (!resource) {
                throw new HttpError(HttpStatusCode.NOT_FOUND, 'Resource not found');
            }
            sendSuccessResponse(res, resource, 'Resource fetched successfully');
        } catch (error) {
            this.handleError(error, next, 'Failed to fetch resource');
        }
    });

    create = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        if (!this.validateRequest(req, next)) return;

        try {
            // 🔒 Sanitize user input to prevent NoSQL injection
            const sanitizedData = sanitizeNoSQLInput(req.body);
            const resource = await this.service.create(sanitizedData);
            sendCreatedResponse(res, resource, 'Resource created successfully');
        } catch (error) {
            this.handleError(error, next, 'Failed to create resource');
        }
    });

    update = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        if (!this.validateId(req, next)) return;
        if (!this.validateRequest(req, next)) return;

        try {
            // 🔒 Sanitize user input to prevent NoSQL injection
            const sanitizedData = sanitizeNoSQLInput(req.body);
            const resource = await this.service.updateById(req.params.id!, sanitizedData);
            if (!resource) {
                throw new HttpError(HttpStatusCode.NOT_FOUND, 'Resource not found');
            }
            sendSuccessResponse(res, resource, 'Resource updated successfully');
        } catch (error) {
            this.handleError(error, next, 'Failed to update resource');
        }
    });

    delete = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        if (!this.validateId(req, next)) return;

        try {
            await this.service.deleteById(req.params.id!);
            sendDeletedResponse(res, 'Resource deleted successfully');
        } catch (error) {
            this.handleError(error, next, 'Failed to delete resource');
        }
    });
}
