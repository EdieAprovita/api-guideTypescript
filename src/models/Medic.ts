import mongoose, { Schema } from "mongoose";

import { Medic } from "../types/modalTypes";

const medicSchema: Schema = new mongoose.Schema<Medic>(
	{
		name: {
			type: String,
			required: true,
			unique: true,
		},
		specialty: {
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
			unique: true,
		},
		address: {
			type: String,
			required: true,
		},
		appointments: {
			type: [
				{
					patientName: String,
					date: Date,
					reason: String,
					notes: String,
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

const Medic = mongoose.model<Medic>("Medic", medicSchema);

export default Medic;
