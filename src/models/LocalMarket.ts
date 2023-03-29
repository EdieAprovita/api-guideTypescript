import mongoose, { Schema } from "mongoose";

import { LocalMarket, Product } from "../types/modalTypes";

const localMarketSchema: Schema = new mongoose.Schema<LocalMarket>(
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
		products: {
			type: [
				{
					name: String,
					category: String,
					price: Number,
					quantity: Number,
				},
			],
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
