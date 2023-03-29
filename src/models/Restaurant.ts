import mongoose, { Schema } from "mongoose";

import { Restaurant } from "../types/modalTypes";

const restaurantSchema: Schema = new mongoose.Schema<Restaurant>(
	{
		name: {
			type: String,
			required: true,
			unique: true,
		},
		address: {
			type: String,
			required: true,
		},
		phone: {
			type: String,
			required: true,
		},
		cuisine: {
			type: [String],
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

const Restaurant = mongoose.model<Restaurant>(
    "Restaurant",
    restaurantSchema
);

export default Restaurant;