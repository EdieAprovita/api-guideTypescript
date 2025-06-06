import mongoose, { Schema, Types, Document } from "mongoose";

export interface IMarket extends Document {
	_id: string;
	marketName: string;
	author: Types.ObjectId;
	address: string;
	image: string;
	typeMarket: string;
	reviews: Types.ObjectId[];
	rating: number;
	numReviews: number;
	timestamps: {
		createdAt: Date;
		updatedAt: Date;
	};
}

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
			required: true,
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
				type: Schema.Types.ObjectId,
				ref: "Review",
			},
		],
		rating: {
			type: Number,
			required: true,
			default: 0,
		},
		numReviews: {
			type: Number,
			required: true,
			default: 0,
		},
	},
	{ timestamps: true }
);

export const Market = mongoose.model<IMarket>("Market", marketSchema);
