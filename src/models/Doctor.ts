import mongoose, { Schema, Types, Document } from 'mongoose';

import { IContact } from '../types/modalTypes';
import { IGeoJSONPoint } from '../types/GeoJSON';
import { geoJSONPointSchema } from './GeoJSON';

export interface IDoctor extends Document {
    _id: string;
    doctorName: string;
    author: Types.ObjectId;
    address: string;
    location?: IGeoJSONPoint;
    image: string;
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

const doctorSchema = new Schema<IDoctor>(
    {
        doctorName: {
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
        specialty: {
            type: String,
            required: true,
        },
        contact: [
            {
                phone: {
                    type: String,
                    required: true,
                },
                email: {
                    type: String,
                    required: true,
                    unique: true,
                },
                facebook: {
                    type: String,
                    required: false,
                    unique: true,
                },
                instagram: {
                    type: String,
                    required: false,
                    unique: true,
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
doctorSchema.index({ location: '2dsphere' });
export const Doctor = mongoose.model<IDoctor>('Doctor', doctorSchema);
