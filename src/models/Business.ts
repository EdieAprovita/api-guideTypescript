import mongoose, { Schema, Types, Document } from 'mongoose';

import { IContact } from '../types/modalTypes';
import { IGeoJSONPoint } from '../types/GeoJSON';
import { geoJSONPointSchema } from './GeoJSON';

export interface IBusiness extends Document {
    _id: string;
    namePlace: string;
    author: Types.ObjectId;
    address: string;
    location?: IGeoJSONPoint;
    image: string;
    contact: IContact[];
    budget: number;
    typeBusiness: string;
    hours: Array<{
        dayOfWeek: string;
        openTime: string;
        closeTime: string;
    }>;
    reviews: Types.ObjectId[];
    rating: number;
    numReviews: number;
    timestamps: {
        createdAt: Date;
        updatedAt: Date;
    };
}

const businessSchema: Schema = new mongoose.Schema<IBusiness>(
    {
        namePlace: {
            type: String,
            required: true,
            unique: true,
        },
        address: {
            type: String,
            required: true,
        },
        location: geoJSONPointSchema,
        contact: [
            {
                phone: String,
                email: String,
                facebook: String,
                instagram: String,
            },
        ],
        author: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            default: 0,
        },
        image: {
            type: String,
            required: true,
        },
        budget: {
            type: Number,
            required: true,
        },
        typeBusiness: {
            type: String,
            required: true,
        },
        hours: {
            type: [
                {
                    dayOfWeek: String,
                    openTime: String,
                    closeTime: String,
                },
            ],
            required: true,
        },
        reviews: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Review',
            },
        ],
        numReviews: {
            type: Number,
            required: true,
            default: 0,
        },
    },
    { timestamps: true }
);

businessSchema.index({ location: '2dsphere' });

export const Business = mongoose.model<IBusiness>('Business', businessSchema);
