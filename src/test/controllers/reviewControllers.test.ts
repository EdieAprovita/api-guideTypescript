import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { 
    listReviews, 
    addReview, 
    getReviewById, 
    updateReview, 
    deleteReview 
} from '../../controllers/reviewControllers';
import { reviewService } from '../../services/ReviewService';
import { HttpError, HttpStatusCode } from '../../types/Errors';
import { IReview } from '../../models/Review';

// Mock the ReviewService
jest.mock('../../services/ReviewService');

// Mock asyncHandler middleware to simulate error handling
jest.mock('../../middleware/asyncHandler', () => {
    return (fn: Function) => {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                await fn(req, res, next);
            } catch (error) {
                next(error);
            }
        };
    };
});

const mockReviewService = reviewService as jest.Mocked<typeof reviewService>;

describe('Review Controllers', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockRequest = {
            params: {},
            body: {},
        };
        
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        
        mockNext = jest.fn();
    });

    describe('listReviews', () => {
        const mockReviews: Partial<IReview>[] = [
            {
                _id: '507f1f77bcf86cd799439011',
                refId: new Types.ObjectId('507f1f77bcf86cd799439013'),
                refModel: 'Restaurant',
                rating: 5,
                comment: 'Great food!',
                username: 'user123',
                user: new Types.ObjectId('507f1f77bcf86cd799439014'),
                timestamps: {
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            },
            {
                _id: '507f1f77bcf86cd799439012',
                refId: new Types.ObjectId('507f1f77bcf86cd799439013'),
                refModel: 'Restaurant',
                rating: 4,
                comment: 'Good service',
                username: 'user456',
                user: new Types.ObjectId('507f1f77bcf86cd799439015'),
                timestamps: {
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            }
        ];

        it('should successfully list reviews for a model', async () => {
            mockRequest.params = { refId: 'restaurant123', refModel: 'Restaurant' };
            mockReviewService.listReviewsForModel.mockResolvedValue(mockReviews as IReview[]);

            await listReviews(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockReviewService.listReviewsForModel).toHaveBeenCalledWith('restaurant123', 'Restaurant');
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(mockReviews);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 400 error when refId is missing', async () => {
            mockRequest.params = { refModel: 'Restaurant' };

            await listReviews(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: HttpStatusCode.BAD_REQUEST,
                    message: 'Reference ID and model are required'
                })
            );
            expect(mockReviewService.listReviewsForModel).not.toHaveBeenCalled();
        });

        it('should return 400 error when refModel is missing', async () => {
            mockRequest.params = { refId: 'restaurant123' };

            await listReviews(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: HttpStatusCode.BAD_REQUEST,
                    message: 'Reference ID and model are required'
                })
            );
            expect(mockReviewService.listReviewsForModel).not.toHaveBeenCalled();
        });

        it('should handle service errors', async () => {
            mockRequest.params = { refId: 'restaurant123', refModel: 'Restaurant' };
            const serviceError = new Error('Database connection failed');
            mockReviewService.listReviewsForModel.mockRejectedValue(serviceError);

            await listReviews(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(serviceError);
        });

        it('should handle unknown errors', async () => {
            mockRequest.params = { refId: 'restaurant123', refModel: 'Restaurant' };
            const unknownError = new Error('Unknown error');
            mockReviewService.listReviewsForModel.mockRejectedValue(unknownError);

            await listReviews(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(unknownError);
        });
    });

    describe('addReview', () => {
        const mockReviewData = {
            refId: 'restaurant123',
            refModel: 'Restaurant',
            rating: 5,
            comment: 'Excellent food and service!',
            username: 'user123',
            user: 'user123'
        };

        const mockCreatedReview: Partial<IReview> = {
            _id: '507f1f77bcf86cd799439011',
            refId: new Types.ObjectId('507f1f77bcf86cd799439013'),
            refModel: 'Restaurant',
            rating: 5,
            comment: 'Excellent food and service!',
            username: 'user123',
            user: new Types.ObjectId('507f1f77bcf86cd799439014'),
            timestamps: {
                createdAt: new Date(),
                updatedAt: new Date()
            }
        };

        it('should successfully add a new review', async () => {
            mockRequest.body = mockReviewData;
            mockReviewService.addReview.mockResolvedValue(mockCreatedReview as IReview);

            await addReview(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockReviewService.addReview).toHaveBeenCalledWith(mockReviewData);
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(mockCreatedReview);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should handle service errors during review creation', async () => {
            mockRequest.body = mockReviewData;
            const serviceError = new Error('Validation error: rating is required');
            mockReviewService.addReview.mockRejectedValue(serviceError);

            await addReview(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(serviceError);
        });

        it('should handle unknown errors during review creation', async () => {
            mockRequest.body = mockReviewData;
            const unknownError = new Error('Unknown error');
            mockReviewService.addReview.mockRejectedValue(unknownError);

            await addReview(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(unknownError);
        });

        it('should handle empty request body', async () => {
            mockRequest.body = {};
            mockReviewService.addReview.mockResolvedValue(mockCreatedReview as IReview);

            await addReview(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockReviewService.addReview).toHaveBeenCalledWith({});
            expect(mockResponse.status).toHaveBeenCalledWith(201);
        });
    });

    describe('getReviewById', () => {
        const mockReview: Partial<IReview> = {
            _id: '507f1f77bcf86cd799439011',
            refId: new Types.ObjectId('507f1f77bcf86cd799439013'),
            refModel: 'Restaurant',
            rating: 5,
            comment: 'Great food!',
            username: 'user123',
            user: new Types.ObjectId('507f1f77bcf86cd799439014'),
            timestamps: {
                createdAt: new Date(),
                updatedAt: new Date()
            }
        };

        it('should successfully get a review by id', async () => {
            mockRequest.params = { reviewId: '507f1f77bcf86cd799439011' };
            mockReviewService.getReviewById.mockResolvedValue(mockReview as IReview);

            await getReviewById(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockReviewService.getReviewById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({ success: true, data: mockReview });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 400 error when reviewId is missing', async () => {
            mockRequest.params = {};

            await getReviewById(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: HttpStatusCode.BAD_REQUEST,
                    message: 'Review ID is required'
                })
            );
            expect(mockReviewService.getReviewById).not.toHaveBeenCalled();
        });

        it('should handle service errors when getting review', async () => {
            mockRequest.params = { reviewId: '507f1f77bcf86cd799439011' };
            const serviceError = new Error('Review not found');
            mockReviewService.getReviewById.mockRejectedValue(serviceError);

            await getReviewById(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(serviceError);
        });

        it('should handle unknown errors when getting review', async () => {
            mockRequest.params = { reviewId: '507f1f77bcf86cd799439011' };
            const unknownError = new Error('Unknown error');
            mockReviewService.getReviewById.mockRejectedValue(unknownError);

            await getReviewById(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(unknownError);
        });
    });

    describe('updateReview', () => {
        const mockUpdateData = {
            rating: 4,
            comment: 'Updated comment'
        };

        const mockUpdatedReview: Partial<IReview> = {
            _id: '507f1f77bcf86cd799439011',
            refId: new Types.ObjectId('507f1f77bcf86cd799439013'),
            refModel: 'Restaurant',
            rating: 4,
            comment: 'Updated comment',
            username: 'user123',
            user: new Types.ObjectId('507f1f77bcf86cd799439014'),
            timestamps: {
                createdAt: new Date(),
                updatedAt: new Date()
            }
        };

        it('should successfully update a review', async () => {
            mockRequest.params = { id: '507f1f77bcf86cd799439011' };
            mockRequest.body = mockUpdateData;
            mockReviewService.updateReview.mockResolvedValue(mockUpdatedReview as IReview);

            await updateReview(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockReviewService.updateReview).toHaveBeenCalledWith('507f1f77bcf86cd799439011', mockUpdateData);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({ success: true, data: mockUpdatedReview });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 400 error when id is missing', async () => {
            mockRequest.params = {};
            mockRequest.body = mockUpdateData;

            await updateReview(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: HttpStatusCode.BAD_REQUEST,
                    message: 'Review ID is required'
                })
            );
            expect(mockReviewService.updateReview).not.toHaveBeenCalled();
        });

        it('should handle service errors during update', async () => {
            mockRequest.params = { id: '507f1f77bcf86cd799439011' };
            mockRequest.body = mockUpdateData;
            const serviceError = new Error('Review not found');
            mockReviewService.updateReview.mockRejectedValue(serviceError);

            await updateReview(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(serviceError);
        });

        it('should handle unknown errors during update', async () => {
            mockRequest.params = { id: '507f1f77bcf86cd799439011' };
            mockRequest.body = mockUpdateData;
            const unknownError = new Error('Unknown error');
            mockReviewService.updateReview.mockRejectedValue(unknownError);

            await updateReview(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(unknownError);
        });
    });

    describe('deleteReview', () => {
        it('should successfully delete a review', async () => {
            mockRequest.params = { reviewId: '507f1f77bcf86cd799439011' };
            mockReviewService.deleteReview.mockResolvedValue(undefined);

            await deleteReview(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockReviewService.deleteReview).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({ success: true, message: 'Review deleted successfully' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 400 error when reviewId is missing', async () => {
            mockRequest.params = {};

            await deleteReview(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: HttpStatusCode.BAD_REQUEST,
                    message: 'Review ID is required'
                })
            );
            expect(mockReviewService.deleteReview).not.toHaveBeenCalled();
        });

        it('should handle service errors during deletion', async () => {
            mockRequest.params = { reviewId: '507f1f77bcf86cd799439011' };
            const serviceError = new Error('Review not found');
            mockReviewService.deleteReview.mockRejectedValue(serviceError);

            await deleteReview(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(serviceError);
        });

        it('should handle unknown errors during deletion', async () => {
            mockRequest.params = { reviewId: '507f1f77bcf86cd799439011' };
            const unknownError = new Error('Unknown error');
            mockReviewService.deleteReview.mockRejectedValue(unknownError);

            await deleteReview(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(unknownError);
        });
    });

    describe('HttpError handling', () => {
        it('should properly handle HttpError instances', async () => {
            mockRequest.params = { refId: 'restaurant123', refModel: 'Restaurant' };
            const httpError = new HttpError(HttpStatusCode.NOT_FOUND, 'Custom error message');
            mockReviewService.listReviewsForModel.mockRejectedValue(httpError);

            await listReviews(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(httpError);
        });
    });
}); 