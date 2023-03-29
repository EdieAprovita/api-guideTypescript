import mongoose, { Schema } from "mongoose";

import { Recipe } from "../types/modalTypes";

const recipeSchema: Schema = new mongoose.Schema<Recipe>(
	{
		name: {
			type: String,
			required: true,
			unique: true,
		},
		description: {
			type: String,
			required: true,
		},
		ingredients: {
			ingredients: {
				type: [
					{
						name: String,
						quantity: Number,
						unit: String,
					},
				],
				required: true,
			},
		},
		steps: {
			type: [String],
			required: true,
		},
		prepTime: {
			type: Number,
			required: true,
		},
		cookTime: {
			type: Number,
			required: true,
		},
		servings: {
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

const Recipe = mongoose.model<Recipe>("Recipe", recipeSchema);

export default Recipe;
