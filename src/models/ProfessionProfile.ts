import mongoose, { Schema, Types, Document } from "mongoose";

import { IContact, IEducation, IExperience, ISkill, ISocial } from "../types/modalTypes";

export interface IProfessionProfile extends Document {
	_id?: string;
	user: Types.ObjectId;
	contact: IContact[];
	skills: ISkill[];
	experience: IExperience[];
	education: IEducation[];
	social: ISocial[];
	date: Date;
	reviews: Types.ObjectId[];
	rating: number;
	numReviews: number;
	timestamps: {
		createdAt: Date;
		updatedAt: Date;
	};
}

const professionalProfileSchema = new Schema<IProfessionProfile>({
	user: {
		type: Schema.Types.ObjectId,
		ref: "Professional",
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
	skills: [
		{
			skill: {
				type: String,
				required: true,
			},
			company: {
				type: String,
				required: true,
			},
			location: {
				type: String,
				required: true,
			},
			from: {
				type: Date,
				required: true,
			},
			to: {
				type: Date,
			},
			current: {
				type: Boolean,
				default: false,
			},
			description: {
				type: String,
				required: true,
			},
		},
	],
	social: [
		{
			youtube: {
				type: String,
			},
			facebook: {
				type: String,
			},
			twitter: {
				type: String,
			},
			instagram: {
				type: String,
			},
			linkedin: {
				type: String,
			},
		},
	],
	experience: [
		{
			title: {
				type: String,
				required: true,
			},
			company: {
				type: String,
				required: true,
			},
			location: {
				type: String,
				required: true,
			},
			from: {
				type: Date,
				required: true,
			},
			to: {
				type: Date,
			},
			current: {
				type: Boolean,
				default: false,
			},
			description: {
				type: String,
				required: true,
			},
		},
	],
	education: [
		{
			school: {
				type: String,
				required: true,
			},
			degree: {
				type: String,
				required: true,
			},
			fieldOfStudy: {
				type: String,
				required: true,
			},
			from: {
				type: Date,
				required: true,
			},
			to: {
				type: Date,
			},
			current: {
				type: Boolean,
				default: false,
			},
			description: {
				type: String,
				required: true,
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
});

export const ProfessionalProfile = mongoose.model<IProfessionProfile>(
	"ProfessionalProfile",
	professionalProfileSchema
);
