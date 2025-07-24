import bcrypt from 'bcryptjs';
import mongoose, { Schema, Document } from 'mongoose';

/**
 * Email regex that avoids catastrophic backtracking.
 * Exported for reuse across the code base.
 */
export const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export interface IUser extends Document {
    _id: string;
    username: string;
    password: string;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    role: 'user' | 'professional' | 'admin';
    isAdmin: boolean;
    isActive: boolean;
    isDeleted: boolean;
    email: string;
    photo: string;
    firstName?: string;
    lastName?: string;
    timestamps: {
        createdAt: Date;
        updatedAt: Date;
    };
    matchPassword(enteredPassword: string): Promise<boolean>;
}

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
        passwordResetToken: {
            type: String,
        },
        passwordResetExpires: {
            type: Date,
        },
        role: {
            type: String,
            required: true,
            enum: ['user', 'professional', 'admin'],
            default: 'user',
        },
        isAdmin: {
            type: Boolean,
            required: true,
            default: false,
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            // Updated regex is linear-time and slightly stricter to reduce invalid emails
            match: [EMAIL_REGEX, 'Please fill a valid email address'],
        },
        photo: {
            type: String,
            default: 'https://res.cloudinary.com/dzqbzqgjm/image/upload/v1599098981/default-user_qjqjqz.png',
        },
        firstName: {
            type: String,
            trim: true,
            maxlength: 50,
        },
        lastName: {
            type: String,
            trim: true,
            maxlength: 50,
        },
    },
    { timestamps: true }
);

userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '10'));
    }
    next();
});

userSchema.methods.matchPassword = async function (enteredPassword: string) {
    return await bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
