import mongoose, { Schema, Types, Document } from 'mongoose';
import { IContact } from '../types/modalTypes.js';
import { IGeoJSONPoint } from '../types/GeoJSON.js';
import { geoJSONPointSchema } from './GeoJSON.js';
import { contactSchema } from './CommonSchemas.js';

export interface IMarket extends Document {
    _id: string;
    marketName: string;
    author: Types.ObjectId;
    address: string;
    location?: IGeoJSONPoint;
    image?: string;
    typeMarket?: string;
    contact: IContact[];
    products: string[];
    hours: Array<{ day: string; open: string; close: string }>;
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
            alias: 'name',
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
        },
        typeMarket: {
            type: String,
            enum: ['supermarket', 'convenience store', 'grocery store'],
            default: 'supermarket',
            alias: 'category',
        },
        contact: [contactSchema],
        products: {
            type: [String],
            default: [],
        },
        hours: {
            type: [
                {
                    day: { type: String },
                    open: { type: String },
                    close: { type: String },
                },
            ],
            default: [],
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
