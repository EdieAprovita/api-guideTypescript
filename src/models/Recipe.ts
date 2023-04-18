import mongoose, { Schema } from "mongoose";

import { IRecipe } from "../types/modalTypes";

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
		},
		rating: {
			type: Number,
			required: true,
		},
		reviews: {
			type: [
				{
					user: String,
					rating: Number,
					comment: String,
					date: Date,
				},
			],
			required: true,
		},
	},
	{ timestamps: true }
);

const Recipe = mongoose.model<IRecipe>("Recipe", recipeSchema);

export default Recipe;
