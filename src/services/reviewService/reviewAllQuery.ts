import { Review, IReview } from '../../models/Review.js';
import { escapeRegex } from '../../utils/escapeRegex.js';

export interface FindAllReviewsParams {
    page?: number;
    limit?: number;
    resourceType?: string;
    minRating?: number;
    sortBy?: 'newest' | 'oldest' | 'rating' | 'helpful';
    search?: string;
}

interface PaginationResult {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrevious: boolean;
}

export async function findAllReviews(params: FindAllReviewsParams): Promise<{
    data: IReview[];
    pagination: PaginationResult;
}> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (params.resourceType) {
        // Normalize to Title-case to match the entityType enum in the model
        const normalized = params.resourceType.charAt(0).toUpperCase() + params.resourceType.slice(1).toLowerCase();
        filter.entityType = normalized;
    }

    if (params.minRating !== undefined) {
        filter.rating = { $gte: params.minRating };
    }

    if (params.search) {
        filter.content = { $regex: escapeRegex(params.search), $options: 'i' };
    }

    const sortMap: Record<NonNullable<FindAllReviewsParams['sortBy']>, Record<string, 1 | -1>> = {
        newest: { createdAt: -1 },
        oldest: { createdAt: 1 },
        rating: { rating: -1 },
        helpful: { helpfulCount: -1 },
    };
    const sortOptions = sortMap[params.sortBy ?? 'newest'];

    const [totalItems, data] = await Promise.all([
        Review.countDocuments(filter),
        Review.find(filter).populate('author', 'username photo').sort(sortOptions).skip(skip).limit(limit).exec(),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
        data: data as unknown as IReview[],
        pagination: {
            currentPage: page,
            totalPages,
            totalItems,
            itemsPerPage: limit,
            hasNext: page < totalPages,
            hasPrevious: page > 1,
        },
    };
}
