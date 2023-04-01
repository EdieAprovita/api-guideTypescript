import mongoose, { Schema } from "mongoose";

import { IMarket } from "../types/modalTypes";
import Review from "./Review";

const marketSchema = new Schema<IMarket>(
	{
		marketName: {
			type: String,
			required: true,
			unique: true,
		},
		author: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
		address: {
			type: String,
			required: true,
		},
		image: {
			type: String,
			required: true,
		},
		typeMarket: {
			type: String,
			required: true,
			enum: ["supermarket", "convenience store", "grocery store"],
		},
		reviews: [
			{
				type: [Review.schema],
			},
		],
		rating: {
			type: Number,
			required: true,
		},
		numReviews: {
			type: Number,
			required: true,
		},
	},
	{ timestamps: true }
);

const Market = mongoose.model<IMarket>("Market", marketSchema);
export default Market;
