import mongoose, { Schema, Types, Document } from 'mongoose';

import { IContact } from '../types/modalTypes';
import { IGeoJSONPoint } from '../types/GeoJSON';
import { geoJSONPointSchema } from './GeoJSON';

export interface IRestaurant extends Document {
    _id: string;
    restaurantName: string;
    author: Types.ObjectId;
    typePlace: string;
    address: string;
    location?: IGeoJSONPoint;
    image: string;
    budget: string;
    contact: IContact[];
    cuisine: [string];
    reviews: Types.ObjectId[];
    rating: number;
    numReviews: number;
    timestamps: {
        createdAt: Date;
        updatedAt: Date;
    };
}

const restaurantSchema: Schema = new mongoose.Schema<IRestaurant>(
    {
        restaurantName: {
            type: String,
            required: true,
            unique: true,
        },
        address: {
            type: String,
            required: true,
        },
        location: geoJSONPointSchema,
        author: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        contact: [
            {
                phone: String,
                facebook: String,
                instagram: String,
            },
        ],
        cuisine: {
            type: [String],
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            default: 0,
        },
        reviews: {
            type: [
                {
                    user: String,
                    rating: Number,
                    comment: String,
                    date: Date,
                },
            ],
            required: true,
        },
        numReviews: {
            type: Number,
            required: true,
            default: 0,
        },
    },
    { timestamps: true }
);
restaurantSchema.index({ location: '2dsphere' });

export const Restaurant = mongoose.models.Restaurant || mongoose.model<IRestaurant>('Restaurant', restaurantSchema);
