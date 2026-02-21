import mongoose, { Schema, Types, Document } from 'mongoose';

export interface IRecipe extends Document {
    _id: string;
    title: string;
    author: Types.ObjectId;
    description: string;
    instructions: string[];
    ingredients: Array<string>;
    typeDish?: string;
    image: string;
    cookingTime: number;
    preparationTime: number;
    servings: number;
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
        // BUG-7: [String] array — frontend sends instructions as an array
        instructions: {
            type: [String],
            required: true,
        },
        image: {
            type: String,
            required: true,
        },
        // BUG-5: optional — frontend sends 'categories[]' not 'typeDish'
        typeDish: {
            type: String,
        },
        difficulty: {
            type: String,
            required: true,
            // Fix (Copilot): accept legacy capitalized values to avoid breaking existing records.
            // The set transformer normalizes everything to lowercase on save — DB converges
            // to lowercase without a manual data migration.
            enum: ['easy', 'medium', 'hard', 'Easy', 'Medium', 'Hard'],
            default: 'medium',
            set: (value: string) => (typeof value === 'string' ? value.toLowerCase() : value),
        },
        servings: {
            type: Number,
            required: true,
            default: 1,
        },
        cookingTime: {
            type: Number,
            required: true,
        },
        preparationTime: {
            type: Number,
            required: true,
            default: 0,
        },
        budget: {
            type: String,
            required: true,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
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

export const Recipe =
    (mongoose.models.Recipe as mongoose.Model<IRecipe>) || mongoose.model<IRecipe>('Recipe', recipeSchema);
