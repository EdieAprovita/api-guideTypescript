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
export interface IUser extends Document {
	_id?: string;
	username: string;
	password: string;
	role: "user" | "admin" | "professional";
	email: string;
	photo: string;
	timestamps: {
		createdAt: Date;
		updatedAt: Date;
	};
	matchPassword(enteredPassword: string): Promise<boolean>;
}

export interface IContact {
	phone: number;
	email: string;
	facebook?: string;
	instagram?: string;
}

export interface IBusiness extends Document {
	_id?: string;
	namePlace: string;
	author: Types.ObjectId;
	address: string;
	image: string;
	contact: IContact[];
	budget: number;
	typeBusiness: string;
	hours: [Date];
	reviews: Types.ObjectId[];
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
	contact: IContact[];
	reviews: Types.ObjectId[];
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
	reviews: Types.ObjectId[];
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
		},
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
	contact: IContact[];
	reviews: Types.ObjectId[];
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
	refId: Types.ObjectId;
	refModel: string;
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

export interface IProfessionProfile extends Document {
	_id?: string;
	user: Types.ObjectId;
	contact: IContact[];
	skills: Array<string>;
	experience: IExperience[];
	education: IEducation[];
	social: ISocial;
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
	ingredients: Array<string>;
	typeDish: string;
	image: string;
	cookingTime: number;
	difficulty: string;
	reviews: Types.ObjectId[];
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
	contact: IContact[];
	cuisine: [string];
	reviews: Types.ObjectId[];
	rating: number;
	numReviews: number;
	timestamps: {
		createdAt: Date;
		updatedAt: Date;
	};
}
