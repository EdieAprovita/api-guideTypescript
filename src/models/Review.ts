import mongoose, { Schema, Types } from "mongoose";

export interface IReview extends Document {
	_id?: string;
	username: string;
	rating: number;
	comment: string;
	user: Types.ObjectId;
	refId: Types.ObjectId;
	refModel: string;
	timestamps: {
		createdAt: Date;
		updatedAt: Date;
	};
}

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

export const Review = mongoose.model<IReview>("Review", reviewSchema);
