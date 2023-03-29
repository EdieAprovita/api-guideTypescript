import mongoose, { Schema } from "mongoose";

import { User } from "../types/modalTypes";

const userSchema: Schema = new mongoose.Schema<User>(
	{
		username: {
			type: String,
			required: true,
			unique: true,
		},
		password: {
			type: String,
			required: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
		},
		isAdmin: {
			type: Boolean,
			required: true,
			default: false,
		},
		isProfesional: {
			type: Boolean,
			required: true,
			default: false,
		},
	},
	{ timestamps: true }
);

const User = mongoose.model<User>("User", userSchema);

export default User;