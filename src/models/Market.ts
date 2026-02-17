import mongoose, { Schema, Types, Document } from 'mongoose';
import { IGeoJSONPoint } from '../types/GeoJSON.js';
import { geoJSONPointSchema } from './GeoJSON.js';

export interface IMarket extends Document {
    _id: string;
    marketName: string;
    author: Types.ObjectId;
    address: string;
    location?: IGeoJSONPoint;
    image: string;
    typeMarket: string;
    reviews: Types.ObjectId[];
    rating: number;
    numReviews: number;
    timestamps: {
        createdAt: Date;
        updatedAt: Date;
    };
}

const marketSchema = new Schema<IMarket>(
    {
        marketName: {
            type: String,
            required: true,
            unique: true,
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        location: geoJSONPointSchema,
        image: {
            type: String,
            required: true,
        },
        typeMarket: {
            type: String,
            required: true,
            enum: ['supermarket', 'convenience store', 'grocery store'],
        },
        reviews: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Review',
            },
        ],
        rating: {
            type: Number,
            required: true,
            default: 0,
        },
        numReviews: {
            type: Number,
            required: true,
            default: 0,
        },
    },
    { timestamps: true }
);
marketSchema.index({ location: '2dsphere' });

export const Market =
    (mongoose.models.Market as mongoose.Model<IMarket>) || mongoose.model<IMarket>('Market', marketSchema);
