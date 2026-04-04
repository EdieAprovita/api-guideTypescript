import {
    getReviewsByEntity,
    getReviewStats,
    getReviewById,
    getTopRatedReviews,
    listReviewsForModel,
    findByUserAndEntity,
} from './reviewService/reviewQueries.js';
import {
    addReview,
    createReview,
    updateReview,
    deleteReview,
    markAsHelpful,
    removeHelpfulVote,
} from './reviewService/reviewMutations.js';

export const reviewService = {
    async getReviewsByEntity(...args: Parameters<typeof getReviewsByEntity>) {
        return getReviewsByEntity(...args);
    },

    async getReviewStats(...args: Parameters<typeof getReviewStats>) {
        return getReviewStats(...args);
    },

    async addReview(...args: Parameters<typeof addReview>) {
        return addReview(...args);
    },

    async createReview(...args: Parameters<typeof createReview>) {
        return createReview(...args);
    },

    async updateReview(...args: Parameters<typeof updateReview>) {
        return updateReview(...args);
    },

    async deleteReview(...args: Parameters<typeof deleteReview>) {
        return deleteReview(...args);
    },

    async markAsHelpful(...args: Parameters<typeof markAsHelpful>) {
        return markAsHelpful(...args);
    },

    async removeHelpfulVote(...args: Parameters<typeof removeHelpfulVote>) {
        return removeHelpfulVote(...args);
    },

    async findByUserAndEntity(...args: Parameters<typeof findByUserAndEntity>) {
        return findByUserAndEntity(...args);
    },

    async getReviewById(...args: Parameters<typeof getReviewById>) {
        return getReviewById(...args);
    },

    async getTopRatedReviews(...args: Parameters<typeof getTopRatedReviews>) {
        return getTopRatedReviews(...args);
    },

    async listReviewsForModel(...args: Parameters<typeof listReviewsForModel>) {
        return listReviewsForModel(...args);
    },
};
