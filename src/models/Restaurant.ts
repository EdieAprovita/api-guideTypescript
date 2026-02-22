import mongoose, { Schema, Types, Document } from 'mongoose';

import { IContact } from '../types/modalTypes.js';
import { IGeoJSONPoint } from '../types/GeoJSON.js';
import { geoJSONPointSchema } from './GeoJSON.js';

export interface IRestaurant extends Document {
    _id: string;
    restaurantName: string;
    author: Types.ObjectId;
    address: string;
    location?: IGeoJSONPoint;
    image?: string;
    budget?: string;
    contact: IContact[];
    cuisine: string[];
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
        // PR review fix: removed Mongoose `alias` — alias only works on in-memory instances,
        // not for Model.find({ name: 'x' }) queries. Virtual field below provides the same
        // in-memory getter/setter without misleading consumers into thinking queries work.
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
        image: {
            type: String,
        },
        budget: {
            type: String,
        },
        rating: {
            type: Number,
            required: true,
            default: 0,
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
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual `name` provides a document-level getter/setter for restaurantName.
// IMPORTANT: Like Mongoose alias, virtuals are NOT available in queries.
// Always use { restaurantName: 'x' } with Model.find() — never { name: 'x' }.
restaurantSchema
    .virtual('name')
    .get(function (this: IRestaurant) {
        return this.restaurantName;
    })
    .set(function (this: IRestaurant, value: string) {
        this.restaurantName = value;
    });

restaurantSchema.index({ location: '2dsphere' });

export const Restaurant =
    (mongoose.models.Restaurant as mongoose.Model<IRestaurant>) ||
    mongoose.model<IRestaurant>('Restaurant', restaurantSchema);
