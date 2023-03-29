export interface User {
	username: string;
	password: string;
	email: string;
	isAdmin: boolean;
	isProfesional: boolean;
}

export interface Profession {
	name: string;
	description: string;
	salary: number;
	requirements: string[];
	createdAt: Date;
	updatedAt: Date;
	creator: string;
	skills: Skill[];
}

export interface Skill {
	name: string;
	level: number;
	description: string;
}

export interface Restaurant {
	name: string;
	address: string;
	phone: string;
	cuisine: string[];
	rating: number;
	reviews: Review[];
	createdAt: Date;
	updatedAt: Date;
}

export interface Review {
	user: string;
	rating: number;
	comment: string;
	date: Date;
}

export interface LocalMarket {
	name: string;
	address: string;
	phone: string;
	products: Product[];
	rating: number;
	reviews: Review[];
	createdAt: Date;
	updatedAt: Date;
}

export interface Product {
	name: string;
	category: string;
	price: number;
	quantity: number;
}

export interface Medic {
	name: string;
	specialty: string;
	phone: string;
	email: string;
	address: string;
	appointments: Appointment[];
	createdAt: Date;
	updatedAt: Date;
}

export interface Appointment {
	patientName: string;
	date: Date;
	reason: string;
	notes: string;
}

export interface Recipe {
	name: string;
	description: string;
	ingredients: Ingredient[];
	steps: string[];
	prepTime: number;
	cookTime: number;
	servings: number;
	rating: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface Ingredient {
	name: string;
	quantity: number;
	unit: string;
}

export interface Business {
	name: string;
	address: string;
	phone: string;
	email: string;
	website: string;
	description: string;
	rating: number;
	categories: string[];
	hours: BusinessHours[];
	createdAt: Date;
	updatedAt: Date;
}

export interface BusinessHours {
	dayOfWeek: string;
	openTime: string;
	closeTime: string;
}

