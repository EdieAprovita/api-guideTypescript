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
			ref: "User",
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
				ref: "Review",
			},
		],
	},
	{ timestamps: true }
);

const Recipe = mongoose.model<IRecipe>("Recipe", recipeSchema);

export default Recipe;
