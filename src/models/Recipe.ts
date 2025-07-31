import mongoose, { Schema, Types, Document } from 'mongoose';

export interface IRecipe extends Document {
    _id: string;
    title: string;
    author: Types.ObjectId;
    description: string;
    instructions: string;
    ingredients: Array<string>;
    typeDish: string;
    image: string;
    cookingTime: number;
    difficulty: string;
    reviews: Types.ObjectId[];
    rating: number;
    numReviews: number;
    budget: string;
    timestamps: {
        createdAt: Date;
        updatedAt: Date;
    };
}

const recipeSchema: Schema = new mongoose.Schema<IRecipe>(
    {
        title: {
            type: String,
            required: true,
            unique: true,
        },
        description: {
            type: String,
            required: true,
        },
        ingredients: {
            type: [String],
            required: true,
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        instructions: {
            type: String,
            required: true,
        },
        cookingTime: {
            type: Number,
            required: true,
        },
        numReviews: {
            type: Number,
            required: true,
            default: 0,
        },
        rating: {
            type: Number,
            required: true,
            default: 0,
        },
        reviews: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Review',
            },
        ],
    },
    { timestamps: true }
);

export const Recipe = (mongoose.models.Recipe as mongoose.Model<IRecipe>) || mongoose.model<IRecipe>('Recipe', recipeSchema);
