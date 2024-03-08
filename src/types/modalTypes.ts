import { Document, Types } from "mongoose";

declare global {
	namespace Express {
		interface Request {
			user?: {
				_id?: string;
				role: "user" | "admin" | "professional";
			};
		}
	}
}

export interface IContact {
	phone: number;
	email: string;
	facebook?: string;
	instagram?: string;
}

export interface IPost extends Document {
	_id?: string;
	author: Types.ObjectId;
	text: string;
	avatar: string;
	likes: [{ username: Types.ObjectId }];
	comments: [
		{
			username: Types.ObjectId;
			text: string;
			name: string;
			avatar: string;
			date: Date;
		},
	];
	date: Date;
	timestamps: {
		createdAt: Date;
		updatedAt: Date;
	};
}

export interface IExperience {
	title: string;
	company: string;
	location: string;
	from: Date;
	to: Date;
	current: boolean;
	description: string;
}

export interface IEducation {
	school: string;
	degree: string;
	fieldOfStudy: string;
	from: Date;
	to: Date;
	current: boolean;
	description: string;
}

export interface ISocial {
	youtube?: string;
	facebook?: string;
	twitter?: string;
	instagram?: string;
	linkedin?: string;
}

export interface ISkill {
	skill: string;
	company: string;
	location: string;
	from: Date;
	to: Date;
	current: boolean;
	description: string;
}
