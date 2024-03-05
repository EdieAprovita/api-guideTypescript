import mongoose, { Schema } from "mongoose";

import { IReview } from "../types/modalTypes";

const reviewSchema: Schema = new mongoose.Schema<IReview>(
	{
		username: {
			type: String,
			required: true,
		},
		rating: {
			type: Number,
			required: true,
		},
		comment: {
			type: String,
			required: true,
		},
		user: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
		refId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		refModel: {
			type: String,
			required: true,
		},
	},
	{ timestamps: true }
);

const Review = mongoose.model<IReview>("Review", reviewSchema);
export default Review;
