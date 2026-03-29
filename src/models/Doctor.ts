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
        // PR review fix: removed Mongoose `alias` — alias only works on in-memory instances,
        // not for Model.find({ name: 'x' }) queries. Virtual field below provides the same
        // in-memory getter/setter without misleading consumers into thinking queries work.
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
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
// Virtual `name` provides a document-level getter/setter for doctorName.
// IMPORTANT: Like Mongoose alias, virtuals are NOT available in queries.
// Always use { doctorName: 'x' } with Model.find() — never { name: 'x' }.
doctorSchema
    .virtual('name')
    .get(function (this: IDoctor) {
        return this.doctorName;
    })
    .set(function (this: IDoctor, value: string) {
        this.doctorName = value;
    });

doctorSchema.index({ location: '2dsphere' });

// Performance indexes — Sprint 5
doctorSchema.index({ rating: -1 });
doctorSchema.index({ createdAt: -1 });
doctorSchema.index({ author: 1 });
doctorSchema.index({ specialty: 1 });

export const Doctor =
    (mongoose.models.Doctor as mongoose.Model<IDoctor>) || mongoose.model<IDoctor>('Doctor', doctorSchema);
