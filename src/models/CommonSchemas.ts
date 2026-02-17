import { Schema } from 'mongoose';

/**
 * @description Shared contact schema for various entities
 */
export const contactSchema = new Schema(
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
    { _id: false }
);
