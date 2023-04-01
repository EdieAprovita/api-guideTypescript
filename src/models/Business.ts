import mongoose, { Schema } from "mongoose";

import { Business } from "../types/modalTypes";

const businessSchema: Schema = new mongoose.Schema<Business>(
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
		email: {
			type: String,
			required: true,
		},
		website: {
			type: String,
			required: true,
		},
		description: {
			type: String,
			required: true,
		},
		rating: {
			type: Number,
			required: true,
		},
		categories: {
			type: [String],
			required: true,
		},
		hours: {
			type: [
				{
					dayOfWeek: String,
					openTime: String,
					closeTime: String,
				},
			],
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

const Business = mongoose.model<Business>("Business", businessSchema);

export default Business;
