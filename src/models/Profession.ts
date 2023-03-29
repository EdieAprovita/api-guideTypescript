import mongoose, { Schema } from "mongoose";

import { Profession } from "../types/modalTypes";

const professionSchema: Schema = new mongoose.Schema<Profession>(
	{
		name: {
			type: String,
			required: true,
			unique: true,
		},
		description: {
			type: String,
			required: true,
		},
		salary: {
			type: Number,
			required: true,
		},
		requirements: {
			type: [String],
			required: true,
		},
		creator: {
			type: String,
			required: true,
		},
		skills: {
			type: [
				{
					name: String,
					level: Number,
					description: String,
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
                }
            ],
            required: true,
        },
	},
	{ timestamps: true }
);

const Profession = mongoose.model<Profession>("Profession", professionSchema);

export default Profession;