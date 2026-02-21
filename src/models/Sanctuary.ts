import mongoose, { Schema, Types, Document } from 'mongoose';

import { IAnimal, IContact } from '../types/modalTypes.js';
import { IGeoJSONPoint } from '../types/GeoJSON.js';
import { geoJSONPointSchema } from './GeoJSON.js';
import { contactSchema } from './CommonSchemas.js';

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
                },
                gender: {
                    type: String,
                },
                habitat: {
                    type: String,
                },
                diet: {
                    type: [String],
                    default: [],
                },
                image: {
                    type: String,
                },
                vaccines: {
                    type: [String],
                    default: [],
                },
                lastVaccine: {
                    type: Date,
                },
                // BUG-8: additional fields sent by frontend
                breed: {
                    type: String,
                },
                description: {
                    type: String,
                },
                rescued: {
                    type: Boolean,
                    default: false,
                },
                rescueDate: {
                    type: Date,
                },
                healthStatus: {
                    type: String,
                },
                specialNeeds: {
                    type: [String],
                    default: [],
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
sanctuarySchema.index({ location: '2dsphere' });
export const Sanctuary =
    (mongoose.models.sanctuary as mongoose.Model<ISanctuary>) ||
    mongoose.model<ISanctuary>('sanctuary', sanctuarySchema);
