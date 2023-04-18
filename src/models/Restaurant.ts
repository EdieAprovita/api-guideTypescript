import mongoose, { Schema } from "mongoose";

import { IRestaurant } from "../types/modalTypes";

const restaurantSchema: Schema = new mongoose.Schema<IRestaurant>(
	{
		restaurantName: {
			type: String,
			required: true,
			unique: true,
		},
		address: {
			type: String,
			required: true,
		},
		contact: [
			{
				phone: String,
				facebook: String,
				instagram: String,
			},
		],
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
		numReviews: {
			type: Number,
			required: true,
		},
	},
	{ timestamps: true }
);

const Restaurant = mongoose.model<IRestaurant>("Restaurant", restaurantSchema);

export default Restaurant;
