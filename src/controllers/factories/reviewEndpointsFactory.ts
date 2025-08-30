import { Request, Response, NextFunction, RequestHandler } from 'express';
import asyncHandler from '../../middleware/asyncHandler';
import { HttpError, HttpStatusCode } from '../../types/Errors';
import { reviewService as ReviewService } from '../../services/ReviewService';

type EntityType = 'Restaurant' | 'Recipe' | 'Market' | 'Business' | 'Doctor';

interface EntityService<T> {
    findById(id: string): Promise<T | null>;
}

export function createAddReviewHandler<T>(
    entityType: EntityType,
    entityService: EntityService<T>,
    aliasFieldName: string
): RequestHandler {
    return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const userId = req.user?._id;

            if (!userId) {
                throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'Authentication required');
            }
            if (!id) {
                throw new HttpError(HttpStatusCode.BAD_REQUEST, `${entityType} ID is required`);
            }

            const entity = await entityService.findById(id);
            if (!entity) {
                throw new HttpError(HttpStatusCode.NOT_FOUND, `${entityType} not found`);
            }

            const existingReview = await ReviewService.findByUserAndEntity(userId.toString(), entityType, id);
            if (existingReview) {
                throw new HttpError(HttpStatusCode.CONFLICT, `User has already reviewed this ${entityType.toLowerCase()}`);
            }

            const reviewData = {
                ...req.body,
                author: userId,
                [aliasFieldName]: id,
            } as Record<string, unknown>;

            const newReview = await ReviewService.addReview(reviewData);
            res.status(201).json({ success: true, message: 'Review added successfully', data: newReview });
        } catch (error) {
            next(error);
        }
    });
}

export function createGetReviewsHandler<T>(
    entityType: EntityType,
    entityService: EntityService<T>
): RequestHandler {
    return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { page = 1, limit = 10, rating, sort = '-createdAt' } = req.query;

            if (!id) {
                throw new HttpError(HttpStatusCode.BAD_REQUEST, `${entityType} ID is required`);
            }

            const entity = await entityService.findById(id);
            if (!entity) {
                throw new HttpError(HttpStatusCode.NOT_FOUND, `${entityType} not found`);
            }

            const reviews = await ReviewService.getReviewsByEntity(entityType, id, {
                page: Number(page),
                limit: Number(limit),
                ...(rating ? { rating: Number(rating) } : {}),
                sort: String(sort),
            });

            res.status(200).json({ success: true, data: reviews.data, pagination: reviews.pagination });
        } catch (error) {
            next(error);
        }
    });
}

export function createGetReviewStatsHandler<T>(
    entityType: EntityType,
    entityService: EntityService<T>
): RequestHandler {
    return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            if (!id) {
                throw new HttpError(HttpStatusCode.BAD_REQUEST, `${entityType} ID is required`);
            }

            const entity = await entityService.findById(id);
            if (!entity) {
                throw new HttpError(HttpStatusCode.NOT_FOUND, `${entityType} not found`);
            }

            const stats = await ReviewService.getReviewStats(entityType, id);
            res.status(200).json({ success: true, data: stats });
        } catch (error) {
            next(error);
        }
    });
}
