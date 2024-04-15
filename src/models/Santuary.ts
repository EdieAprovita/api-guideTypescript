import mongoose, { Schema, Types, Document } from "mongoose";

import { IAnimal, IContact } from "../types/modalTypes";

export interface ISantuary extends Document {
	_id?: string;
	santuaryName: string;
	author: Types.ObjectId;
	address?: string;
	image: string;
	typeofSantuary: string;
	animals: IAnimal[];
	capacity: number;
	caretakers: string[];
	contact: IContact[];
	reviews: Types.ObjectId[];
	rating: number;
	numReviews: number;
	timestamps: {
		createdAt: Date;
		updatedAt: Date;
	};
}

const santuarySchema = new Schema<ISantuary>(
	{
		santuaryName: {
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
		},
		image: {
			type: String,
			required: true,
		},
		typeofSantuary: {
			type: String,
			required: true,
		},
		animals: [
			{
				animalName: {
					type: String,
					required: true,
				},
				specie: {
					type: String,
					required: true,
				},
				age: {
					type: Number,
					required: true,
				},
				gender: {
					type: String,
					required: true,
				},
				habitat: {
					type: String,
					required: true,
				},
				diet: {
					type: [String],
					required: true,
				},
				image: {
					type: String,
					required: true,
				},
				vaccines: {
					type: [String],
					required: true,
				},
				lastVaccine: {
					type: Date,
				},
			},
		],
		capacity: {
			type: Number,
			required: true,
		},
		caretakers: {
			type: [String],
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
					unique: true,
				},
				facebook: {
					type: String,
					required: false,
					unique: true,
				},
				instagram: {
					type: String,
					required: false,
					unique: true,
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
export const Santuary = mongoose.model<ISantuary>("Santuary", santuarySchema);
