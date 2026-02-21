import mongoose, { Schema, Types, Document } from 'mongoose';

import { IContact } from '../types/modalTypes.js';
import { IGeoJSONPoint } from '../types/GeoJSON.js';
import { geoJSONPointSchema } from './GeoJSON.js';
import { contactSchema } from './CommonSchemas.js';

export interface IDoctor extends Document {
    _id: string;
    doctorName: string;
    author: Types.ObjectId;
    address: string;
    location?: IGeoJSONPoint;
    image?: string;
    specialty: string;
    education: string[];
    experience?: string;
    languages: string[];
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
        specialty: {
            type: String,
            required: true,
        },
        education: {
            type: [String],
            default: [],
        },
        experience: {
            type: String,
        },
        languages: {
            type: [String],
            default: [],
        },
        contact: [contactSchema],
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
export const Doctor =
    (mongoose.models.Doctor as mongoose.Model<IDoctor>) || mongoose.model<IDoctor>('Doctor', doctorSchema);
