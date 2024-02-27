import mongoose, { Schema } from "mongoose";

import { IBusiness } from "../types/modalTypes";

const businessSchema: Schema = new mongoose.Schema<IBusiness>(
	{
		namePlace: {
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
				email: String,
				facebook: String,
				instagram: String,
			},
		],
		author: {
			type: Schema.Types.ObjectId,
			required: true,
		},
		rating: {
			type: Number,
			required: true,
		},
		image: {
			type: String,
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
		reviews: [
			{
				type: Schema.Types.ObjectId,
				ref: "Review",
			},
		],
		numReviews: {
			type: Number,
			required: true,
		},
	},
	{ timestamps: true }
);

const Business = mongoose.model<IBusiness>("Business", businessSchema);

export default Business;
