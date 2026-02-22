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
        // Schema uses [String] — frontend sends instructions as an array.
        instructions: {
            type: [String],
            required: true,
        },
        image: {
            type: String,
            required: true,
        },
        // Optional — frontend sends 'categories[]' not 'typeDish'
        typeDish: {
            type: String,
        },
        difficulty: {
            type: String,
            required: true,
            // Accept legacy capitalized values to avoid breaking existing records.
            // NOTE: The `set` transformer only runs on save/update, not on queries.
            //       This means Recipe.find({ difficulty: 'easy' }) will NOT match legacy records
            //       stored as 'Easy'/'Medium'/'Hard' until those documents are re-saved or migrated.
            //       Run a one-time migration to normalize existing values, then remove
            //       'Easy'/'Medium'/'Hard' from the enum once all records are converted.
            // WARNING: Mongoose setters (like this one) are bypassed when using `findOneAndUpdate()`
            //       with `$set`. Route updates through `.save()` or handle normalisation manually.
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
    {
        timestamps: true,
    }
);

// Document hook runs after retrieving from MongoDB but before passing to application logic.
// Necessary because legacy DB records stored instructions as a single primitive string, whereas
// the schema enforcing Array<string> will cause Mongoose to silently array-wrap them at read-time
// natively in recent versions. The manual coercion guarantees array types strictly at the hydration boundary.
recipeSchema.post('init', function (doc) {
    if (doc.instructions) {
        const raw: unknown = doc.instructions;
        if (typeof raw === 'string') {
            doc.instructions = [raw];
        }
    }
});

recipeSchema.pre('save', function (next) {
    if (this.instructions && !Array.isArray(this.instructions)) {
        this.instructions = [this.instructions as unknown as string];
    }
    next();
});

export const Recipe =
    (mongoose.models.Recipe as mongoose.Model<IRecipe>) || mongoose.model<IRecipe>('Recipe', recipeSchema);
