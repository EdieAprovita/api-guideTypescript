import { Document, Types } from "mongoose";

declare global {
	namespace Express {
		interface Request {
			user?: {
				isAdmin: boolean;
				isProfessional: boolean;
			};
		}
	}
}
export interface IUser extends Document {
	_id?: string;
	username: string;
	password: string;
	role: string;
	email: string;
	photo: string;
	isAdmin: boolean;
	isProfessional: boolean;
	timestamps: {
		createdAt: Date;
		updatedAt: Date;
	};
	matchPassword(enteredPassword: string): Promise<boolean>;
}

export interface IBusiness extends Document {
	_id?: string;
	namePlace: string;
	author: Types.ObjectId;
	address: string;
	image: string;
	contact: [
		{
			phone: string;
			email: string;
			facebook: string;
			instagram: string;
		}
	];
	budget: number;
	typeBusiness: string;
	hours: [Date];
	reviews: [Review: unknown];
	rating: number;
	numReviews: number;
	timestamps: {
		createdAt: Date;
		updatedAt: Date;
	};
}

export interface IMedic extends Document {
	_id?: string;
	doctorName: string;
	author: Types.ObjectId;
	address: string;
	image: string;
	specialty: string;
	contact: [
		{
			phone: number;
			email: string;
			facebook?: string;
			instagram?: string;
		}
	];
	reviews: [Review: unknown];
	rating: number;
	numReviews: number;
	timestamps: {
		createdAt: Date;
		updatedAt: Date;
	};
}

export interface IMarket extends Document {
	_id?: string;
	marketName: string;
	author: Types.ObjectId;
	address: string;
	image: string;
	typeMarket: string;
	reviews: [Review: unknown];
	rating: number;
	numReviews: number;
	timestamps: {
		createdAt: Date;
		updatedAt: Date;
	};
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
		}
	];
	date: Date;
	timestamps: {
		createdAt: Date;
		updatedAt: Date;
	};
}

export interface IProfession extends Document {
	_id?: string;
	professionName: string;
	author: Types.ObjectId;
	specialty: string;
	contact: [
		{
			phone: number;
			email: string;
			facebook?: string;
			instagram?: string;
		}
	];
	reviews: [Review: unknown];
	rating: number;
	numReviews: number;
	timestamps: {
		createdAt: Date;
		updatedAt: Date;
	};
}

export interface IReview extends Document {
	_id?: string;
	username: string;
	rating: number;
	comment: string;
	user: Types.ObjectId;
	timestamps: {
		createdAt: Date;
		updatedAt: Date;
	};
}

export interface IProfessionProfile extends Document {
	_id?: string;
	user: Types.ObjectId;
	contact: [{ phone: number; email: string }];
	skills: [string];
	experience: [
		{
			title: string;
			company: string;
			location: string;
			from: Date;
			to: Date;
			current: boolean;
			description: string;
		}
	];
	education: [
		{
			school: string;
			degree: string;
			fieldOfStudy: string;
			from: Date;
			to: Date;
			current: boolean;
			description: string;
		}
	];
	social: [
		{
			youtube: string;
			facebook: string;
			twitter: string;
			instagram: string;
			linkedin: string;
		}
	];
	date: Date;
	timestamps: {
		createdAt: Date;
		updatedAt: Date;
	};
}

export interface IRecipe extends Document {
	_id?: string;
	title: string;
	author: Types.ObjectId;
	description: string;
	instructions: string;
	ingredients: [string];
	typeDish: string;
	image: string;
	cookingTime: number;
	difficulty: string;
	reviews: [Review: unknown];
	rating: number;
	numReviews: number;
	budget: string;
	timestamps: {
		createdAt: Date;
		updatedAt: Date;
	};
}

export interface IRestaurant extends Document {
	_id?: string;
	restaurantName: string;
	author: Types.ObjectId;
	typePlace: string;
	address: string;
	image: string;
	budget: string;
	contact: [
		{
			phone: number;
			facebook: string;
			instagram: string;
		}
	];
	cuisine: [string];
	reviews: [Review: unknown];
	rating: number;
	numReviews: number;
	timestamps: {
		createdAt: Date;
		updatedAt: Date;
	};
}
