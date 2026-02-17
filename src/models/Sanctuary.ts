import mongoose, { Schema, Types, Document } from 'mongoose';

import { IAnimal, IContact } from '../types/modalTypes.js';
import { IGeoJSONPoint } from '../types/GeoJSON.js';
import { geoJSONPointSchema } from './GeoJSON.js';

export interface ISanctuary extends Document {
    _id: string;
    sanctuaryName: string;
    author: Types.ObjectId;
    address?: string;
    location?: IGeoJSONPoint;
    image: string;
    typeofSanctuary: string;
    animals: IAnimal[];
    capacity: number;
    caretakers: string[];
    contact: IContact[];
    reviews: Types.ObjectId[];
    rating: number;
    numReviews: number;
    timestamps: {
        createdAt: Date;
        updatedAt: Date;
    };
}

const sanctuarySchema = new Schema<ISanctuary>(
    {
        sanctuaryName: {
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
        },
        location: geoJSONPointSchema,
        image: {
            type: String,
            required: true,
        },
        typeofSanctuary: {
            type: String,
            required: true,
        },
        animals: [
            {
                animalName: {
                    type: String,
                    required: true,
                    alias: 'name',
                },
                specie: {
                    type: String,
                    required: true,
                    alias: 'species',
                },
                age: {
                    type: Number,
                    required: true,
                },
                gender: {
                    type: String,
                    required: true,
                },
                habitat: {
                    type: String,
                    required: true,
                },
                diet: {
                    type: [String],
                    required: true,
                },
                image: {
                    type: String,
                    required: true,
                },
                vaccines: {
                    type: [String],
                    required: true,
                },
                lastVaccine: {
                    type: Date,
                },
            },
        ],
        capacity: {
            type: Number,
            required: true,
        },
        caretakers: {
            type: [String],
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
sanctuarySchema.index({ location: '2dsphere' });
export const Sanctuary =
    (mongoose.models.sanctuary as mongoose.Model<ISanctuary>) ||
    mongoose.model<ISanctuary>('sanctuary', sanctuarySchema);
