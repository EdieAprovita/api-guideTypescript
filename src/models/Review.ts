import mongoose, { Schema, Types, Document } from 'mongoose';

export interface IReview extends Document {
    _id: string;
    rating: number;
    title: string;
    content: string;
    visitDate: Date;
    recommendedDishes?: string[];
    tags?: string[];
    author: Types.ObjectId;
    restaurant: Types.ObjectId;
    helpfulCount: number;
    helpfulVotes: Types.ObjectId[];
    timestamps: {
        createdAt: Date;
        updatedAt: Date;
    };
}

const reviewSchema: Schema = new mongoose.Schema<IReview>(
    {
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        title: {
            type: String,
            required: true,
            minlength: 5,
            maxlength: 100,
        },
        content: {
            type: String,
            required: true,
            minlength: 10,
            maxlength: 1000,
        },
        visitDate: {
            type: Date,
            default: Date.now,
        },
        recommendedDishes: [{
            type: String,
            maxlength: 50,
        }],
        tags: [{
            type: String,
            maxlength: 30,
        }],
        author: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        restaurant: {
            type: Schema.Types.ObjectId,
            ref: 'Restaurant',
            required: true,
        },
        helpfulCount: {
            type: Number,
            default: 0,
        },
        helpfulVotes: [{
            type: Schema.Types.ObjectId,
            ref: 'User',
        }],
    },
    { timestamps: true }
);

// Compound index to prevent duplicate reviews from same user for same restaurant
reviewSchema.index({ author: 1, restaurant: 1 }, { unique: true });

// Index for efficient querying
reviewSchema.index({ restaurant: 1, rating: -1 });
reviewSchema.index({ author: 1 });

export const Review = mongoose.model<IReview>('Review', reviewSchema);
