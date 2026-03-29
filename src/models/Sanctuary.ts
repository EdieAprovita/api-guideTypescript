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
        // PR review fix: removed Mongoose `alias` — alias only works on in-memory instances,
        // not for Model.find({ name: 'x' }) queries. Virtual field below provides the same
        // in-memory getter/setter without misleading consumers into thinking queries work.
        sanctuaryName: {
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
                },
                specie: {
                    type: String,
                    required: true,
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
                // Additional fields sent by frontend
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
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
// Virtual `name` provides a document-level getter/setter for sanctuaryName.
// IMPORTANT: Like Mongoose alias, virtuals are NOT available in queries.
// Always use { sanctuaryName: 'x' } with Model.find() — never { name: 'x' }.
sanctuarySchema
    .virtual('name')
    .get(function (this: ISanctuary) {
        return this.sanctuaryName;
    })
    .set(function (this: ISanctuary, value: string) {
        this.sanctuaryName = value;
    });

sanctuarySchema.index({ location: '2dsphere' });

// Performance indexes — Sprint 5
sanctuarySchema.index({ rating: -1 });
sanctuarySchema.index({ createdAt: -1 });
sanctuarySchema.index({ author: 1 });

export const Sanctuary =
    (mongoose.models.sanctuary as mongoose.Model<ISanctuary>) ||
    mongoose.model<ISanctuary>('sanctuary', sanctuarySchema);
