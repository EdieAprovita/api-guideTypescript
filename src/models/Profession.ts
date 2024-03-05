import mongoose, { Schema } from "mongoose";

import { IProfessionProfile } from "../types/modalTypes";

const professionalProfileSchema = new Schema<IProfessionProfile>({
	user: {
		type: Schema.Types.ObjectId,
		ref: "User",
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
	skills: [{ type: String }],
	social: {
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
});

const professionalProfile = mongoose.model<IProfessionProfile>(
	"ProfessionalProfile",
	professionalProfileSchema
);
export default professionalProfile;
