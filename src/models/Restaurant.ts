import mongoose, { Schema, Types, Document } from "mongoose";

import { IContact } from "../types/modalTypes";

export interface IRestaurant extends Document {
	_id?: string;
	restaurantName: string;
	author: Types.ObjectId;
	typePlace: string;
	address: string;
	image: string;
	budget: string;
	contact: IContact[];
	cuisine: [string];
	reviews: Types.ObjectId[];
	rating: number;
	numReviews: number;
	timestamps: {
		createdAt: Date;
		updatedAt: Date;
	};
}

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
		author: {
			type: Schema.Types.ObjectId,
			ref: "User",
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
			default: 0,
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
			default: 0,
		},
	},
	{ timestamps: true }
);

export const Restaurant = mongoose.model<IRestaurant>("Restaurant", restaurantSchema);
