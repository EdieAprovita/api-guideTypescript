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
            required: true,
            // Accept legacy capitalized values to avoid breaking existing records on re-save.
            // NOTE: Similar to Recipe difficulty, the `set` transformer only runs on save/update,
            // not on queries. Legacy records may need a manual data migration to lowercase.
            // WARNING: Mongoose setters (like this one) are bypassed when using `findOneAndUpdate()`
            //       with `$set`. Route updates through `.save()` or handle normalization manually.
            // TODO(#123): remove capitalized values from typeMarket after database migration
            enum: [
                'supermarket',
                'convenience store',
                'grocery store',
                'Supermarket',
                'Convenience Store',
                'Grocery Store',
            ],
            // NOTE: The `default: 'supermarket'` is intentional to ensure a fallback category
            //       even though the field is not marked as `required: true`.
            default: 'supermarket',
            set: (value: string) => (typeof value === 'string' ? value.toLowerCase() : value),
        },
        contact: [contactSchema],
        products: {
            type: [String],
            default: [],
        },
        hours: {
            type: [
                {
                    day: {
                        type: String,
                        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
                        required: true,
                    },
                    open: {
                        type: String,
                        match: /^([01]\d|2[0-3]):?([0-5]\d)$/,
                        required: true,
                    },
                    close: {
                        type: String,
                        match: /^([01]\d|2[0-3]):?([0-5]\d)$/,
                        required: true,
                    },
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
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

marketSchema
    .virtual('name')
    .get(function (this: IMarket) {
        return this.marketName;
    })
    .set(function (this: IMarket, value: string) {
        this.marketName = value;
    });

marketSchema
    .virtual('category')
    .get(function (this: IMarket) {
        return this.typeMarket;
    })
    .set(function (this: IMarket, value: string) {
        this.typeMarket = value;
    });

marketSchema.index({ location: '2dsphere' });

export const Market =
    (mongoose.models.Market as mongoose.Model<IMarket>) || mongoose.model<IMarket>('Market', marketSchema);
