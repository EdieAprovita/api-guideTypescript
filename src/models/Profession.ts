import mongoose, { Schema } from "mongoose";

import { IProfession } from "../types/modalTypes";

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

const Profession = mongoose.model<IProfession>("Profession", professionSchema);

export default Profession;
