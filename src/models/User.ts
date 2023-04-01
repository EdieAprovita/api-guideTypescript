import bcrypt from "bcryptjs";
import mongoose, { Schema } from "mongoose";

import { IUser } from "../types/modalTypes";

const userSchema = new Schema<IUser>(
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
		role: {
			type: String,
			required: true,
			enum: ["user", "admin", "professional"],
			default: "user",
		},
		email: {
			type: String,
			required: true,
			unique: true,
		},
		photo: {
			type: String,
			default:
				"https://res.cloudinary.com/dzqbzqgjm/image/upload/v1599098981/default-user_qjqjqz.png",
		},
		isAdmin: {
			type: Boolean,
			required: true,
			default: false,
		},
		isProfessional: {
			type: Boolean,
			required: true,
			default: false,
		},
	},
	{ timestamps: true }
);

//Check if password is correct

userSchema.methods.matchPassword = async function (enteredPassword: string) {
	return await bcrypt.compare(enteredPassword, this.password);
};

//Encrypt password before saving

userSchema.pre("save", async function (next) {
	if (!this.isModified("password")) {
		this.password = await bcrypt.hash(this.password, 10);
	}
	next();
});

const User = mongoose.model<IUser>("User", userSchema);
export default User;
