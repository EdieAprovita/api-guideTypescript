import mongoose, { Schema, Types, Document } from "mongoose";

import { IContact } from "../types/modalTypes";

export interface IProfession extends Document {
	_id: string;
	professionName: string;
	author: Types.ObjectId;
	specialty: string;
	contact: IContact[];
	reviews: Types.ObjectId[];
	rating: number;
	numReviews: number;
	timestamps: {
		createdAt: Date;
		updatedAt: Date;
	};
}
const professionSchema: Schema = new mongoose.Schema<IProfession>(
	{
		professionName: {
			type: String,
			required: true,
		},
		author: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		specialty: {
			type: String,
			required: true,
		},
		contact: [
			{
				phone: {
					type: Number,
					required: true,
				},
				email: {
					type: String,
					required: true,
				},
				facebook: {
					type: String,
				},
				instagram: {
					type: String,
				},
			},
		],
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

export const Profession = mongoose.model<IProfession>("Profession", professionSchema);
