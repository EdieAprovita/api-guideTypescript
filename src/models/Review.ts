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
    // Polymorphic entity fields
    entityType: 'Restaurant' | 'Recipe' | 'Market' | 'Business' | 'Doctor' | 'Sanctuary';
    entity: Types.ObjectId;
    // Legacy field - deprecated, kept for backward compatibility during migration
    restaurant?: Types.ObjectId;
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
        recommendedDishes: [
            {
                type: String,
                maxlength: 50,
            },
        ],
        tags: [
            {
                type: String,
                maxlength: 30,
            },
        ],
        author: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        // Polymorphic entity fields
        entityType: {
            type: String,
            enum: ['Restaurant', 'Recipe', 'Market', 'Business', 'Doctor', 'Sanctuary'],
            required: true,
        },
        entity: {
            type: Schema.Types.ObjectId,
            required: true,
            refPath: 'entityType',
        },
        // Legacy field - deprecated, kept for backward compatibility during migration
        restaurant: {
            type: Schema.Types.ObjectId,
            ref: 'Restaurant',
            required: false,
        },
        helpfulCount: {
            type: Number,
            default: 0,
        },
        helpfulVotes: [
            {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
    },
    { timestamps: true }
);

// Compound index to prevent duplicate reviews from same user for same entity
// Note: use a partial filter to avoid E11000 on legacy docs missing polymorphic fields
reviewSchema.index(
    { author: 1, entityType: 1, entity: 1 },
    {
        unique: true,
        partialFilterExpression: {
            author: { $exists: true },
            entityType: { $exists: true, $ne: null },
            entity: { $exists: true, $ne: null },
        },
    }
);

// Legacy compound index - kept during migration, will be removed in Phase 9
reviewSchema.index({ author: 1, restaurant: 1 }, { unique: false });

// Index for efficient querying by entity
reviewSchema.index({ entityType: 1, entity: 1, rating: -1 });
reviewSchema.index({ entity: 1, createdAt: -1 });
reviewSchema.index({ author: 1 });

// Legacy index - kept during migration
reviewSchema.index({ restaurant: 1, rating: -1 });

export const Review =
    (mongoose.models.Review as mongoose.Model<IReview>) || mongoose.model<IReview>('Review', reviewSchema);
