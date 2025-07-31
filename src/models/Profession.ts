import mongoose, { Schema, Types, Document } from 'mongoose';

import { IContact } from '../types/modalTypes';
import { IGeoJSONPoint } from '../types/GeoJSON';
import { geoJSONPointSchema } from './GeoJSON';

export interface IProfession extends Document {
    _id: string;
    professionName: string;
    author: Types.ObjectId;
    address: string;
    location?: IGeoJSONPoint;
    specialty: string;
    contact: IContact[];
    reviews: Types.ObjectId[];
    rating: number;
    numReviews: number;
    timestamps: {
        createdAt: Date;
        updatedAt: Date;
    };
}
const professionSchema: Schema = new mongoose.Schema<IProfession>(
    {
        professionName: {
            type: String,
            required: true,
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
        specialty: {
            type: String,
            required: true,
        },
        contact: [
            {
                phone: {
                    type: Number,
                    required: true,
                },
                email: {
                    type: String,
                    required: true,
                },
                facebook: {
                    type: String,
                },
                instagram: {
                    type: String,
                },
            },
        ],
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

professionSchema.index({ location: '2dsphere' });

export const Profession = (mongoose.models.Profession as mongoose.Model<IProfession>) || mongoose.model<IProfession>('Profession', professionSchema);
