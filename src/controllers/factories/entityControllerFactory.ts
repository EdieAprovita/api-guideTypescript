import { Request, Response, NextFunction, RequestHandler } from 'express';
import asyncHandler from '../../middleware/asyncHandler.js';
import { HttpError, HttpStatusCode } from '../../types/Errors.js';
import { getErrorMessage } from '../../types/modalTypes.js';
import { Document } from 'mongoose';
import BaseService from '../../services/BaseService.js';
import pkg from 'express-validator';
const { validationResult } = pkg;

/**
 * @description Standard validation check for controllers
 */
export function validateRequest(req: Request, next: NextFunction): boolean {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(firstError?.msg ?? 'Validation error')));
        return false;
    }
    return true;
}

/**
 * @description Creates a standard nearby search handler
 */
export function createGetNearbyHandler<T extends Document>(
    service: BaseService<T>,
    entityName: string
): RequestHandler {
    return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { lat, lng, latitude, longitude, radius, page, limit } = req.query;
            const finalLat = latitude || lat;
            const finalLng = longitude || lng;

            if (!finalLat || !finalLng) {
                return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Latitude and longitude are required'));
            }

            // Parse and validate coordinates are finite numbers
            const parsedLat = Number(finalLat);
            const parsedLng = Number(finalLng);

            if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
                return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Latitude and longitude must be valid numbers'));
            }

            const result = await service.findNearbyPaginated({
                latitude: parsedLat,
                longitude: parsedLng,
                radius: Number(radius) || 5000,
                page: page as string,
                limit: limit as string,
            });

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: `Nearby ${entityName.toLowerCase()}s fetched successfully`,
                data: result.data,
                meta: result.meta,
            });
        } catch (error: any) {
            next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, getErrorMessage(error)));
        }
    });
}

/**
 * @description Creates a standard "getAll" cached/paginated handler
 */
export function createGetAllHandler<T extends Document>(
    service: BaseService<T>,
    entityName: string,
    options: { useCache?: boolean } = {}
): RequestHandler {
    return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { page, limit } = req.query;
            let result;

            if (page || limit) {
                result = await service.getAllPaginated(page as string, limit as string);
                res.status(HttpStatusCode.OK).json({
                    success: true,
                    message: `${entityName}s fetched successfully`,
                    data: result.data,
                    meta: result.meta,
                });
            } else {
                result = options.useCache ? await service.getAllCached() : await service.getAll();
                res.status(HttpStatusCode.OK).json({
                    success: true,
                    message: `${entityName}s fetched successfully`,
                    data: result,
                });
            }
        } catch (error: any) {
            next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, getErrorMessage(error)));
        }
    });
}

/**
 * @description Creates a standard "getById" cached handler
 */
export function createGetByIdHandler<T extends Document>(
    service: BaseService<T>,
    entityName: string,
    options: { useCache?: boolean } = {}
): RequestHandler {
    return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params as { id: string };
            if (!id) {
                return next(new HttpError(HttpStatusCode.BAD_REQUEST, `${entityName} ID is required`));
            }

            const resource = options.useCache ? await service.findByIdCached(id) : await service.findById(id);

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: `${entityName} fetched successfully`,
                data: resource,
            });
        } catch (error: any) {
            next(new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage(error)));
        }
    });
}

/**
 * @description Creates a standard "create" handler
 */
export function createCreateHandler<T extends Document>(
    service: BaseService<T>,
    entityName: string,
    options: { preCreate?: (data: any) => Promise<void> | void; useCache?: boolean } = {}
): RequestHandler {
    return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        if (!validateRequest(req, next)) return;

        try {
            const data = req.body;
            if (options.preCreate) {
                await options.preCreate(data);
            }

            const resource = options.useCache ? await service.createCached(data) : await service.create(data);

            res.status(HttpStatusCode.CREATED).json({
                success: true,
                message: `${entityName} created successfully`,
                data: resource,
            });
        } catch (error: any) {
            next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, getErrorMessage(error)));
        }
    });
}

/**
 * @description Creates a standard "update" handler
 */
export function createUpdateHandler<T extends Document>(
    service: BaseService<T>,
    entityName: string,
    options: { preUpdate?: (data: any) => Promise<void> | void; useCache?: boolean } = {}
): RequestHandler {
    return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        if (!validateRequest(req, next)) return;

        try {
            const { id } = req.params as { id: string };
            if (!id) {
                return next(new HttpError(HttpStatusCode.BAD_REQUEST, `${entityName} ID is required`));
            }

            const data = req.body;
            if (options.preUpdate) {
                await options.preUpdate(data);
            }

            const resource = options.useCache
                ? await service.updateByIdCached(id, data)
                : await service.updateById(id, data);

            if (!resource) {
                return next(new HttpError(HttpStatusCode.NOT_FOUND, `${entityName} not found`));
            }

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: `${entityName} updated successfully`,
                data: resource,
            });
        } catch (error: any) {
            next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, getErrorMessage(error)));
        }
    });
}

/**
 * @description Creates a standard "delete" handler
 */
export function createDeleteHandler<T extends Document>(service: BaseService<T>, entityName: string): RequestHandler {
    return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params as { id: string };
            if (!id) {
                return next(new HttpError(HttpStatusCode.BAD_REQUEST, `${entityName} ID is required`));
            }

            await service.deleteById(id);

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: `${entityName} deleted successfully`,
            });
        } catch (error: any) {
            next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, getErrorMessage(error)));
        }
    });
}
