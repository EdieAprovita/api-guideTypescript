// Global type augmentation for Express Request
declare module 'express-serve-static-core' {
    interface Request {
        user?: {
            _id?: string;
            role: 'user' | 'professional' | 'admin';
        };
    }
}

export const getErrorMessage = (message: string): string =>
    process.env.NODE_ENV === 'development' ? message : 'Internal Server Error';

export interface IContact {
    phone: number;
    email: string;
    facebook?: string;
    instagram?: string;
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

export interface IAnimal {
    _id?: string;
    animalName: string;
    specie: string;
    age: number;
    gender: string;
    habitat: string;
    diet: string[];
    image: string;
    vaccines: string[];
    lastVaccine?: Date;
}
