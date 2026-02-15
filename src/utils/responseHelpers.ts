import { Response } from 'express';
import { HttpStatusCode } from '../types/Errors.js';
import { PaginationMeta } from '../types/pagination.js';

export interface SuccessResponse<T> {
    success: true;
    message: string;
    data: T;
    meta?: PaginationMeta;
}

export interface ErrorResponse {
    success: false;
    message: string;
    error?: string;
}

export const sendSuccessResponse = <T>(
    res: Response,
    data: T,
    message: string = 'Operation successful',
    statusCode: number = HttpStatusCode.OK
): Response<SuccessResponse<T>> => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

export const sendPaginatedResponse = <T>(
    res: Response,
    data: T[],
    meta: PaginationMeta,
    message: string = 'Resources fetched successfully',
    statusCode: number = HttpStatusCode.OK
): Response<SuccessResponse<T[]>> => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        meta,
    });
};

export const sendErrorResponse = (
    res: Response,
    message: string,
    statusCode: number = HttpStatusCode.INTERNAL_SERVER_ERROR,
    error?: string
): Response<ErrorResponse> => {
    return res.status(statusCode).json({
        success: false,
        message,
        ...(error && { error }),
    });
};

export const sendCreatedResponse = <T>(
    res: Response,
    data: T,
    message: string = 'Resource created successfully'
): Response<SuccessResponse<T>> => {
    return sendSuccessResponse(res, data, message, HttpStatusCode.CREATED);
};

export const sendDeletedResponse = (
    res: Response,
    message: string = 'Resource deleted successfully'
): Response<SuccessResponse<null>> => {
    return sendSuccessResponse(res, null, message, HttpStatusCode.OK);
};
