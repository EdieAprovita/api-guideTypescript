import bcrypt from 'bcryptjs';
import mongoose, { Schema, Document } from 'mongoose';

/**
 * Email regex that avoids catastrophic backtracking.
 * Exported for reuse across the code base.
 */
export const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/** Canonical set of valid role values — single source of truth for the role field. */
export type UserRole = 'user' | 'professional' | 'admin';

export interface IUser extends Document {
    _id: string;
    username: string;
    password: string;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    role: UserRole;
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
    pushSubscription?: {
        endpoint: string;
        keys: { p256dh: string; auth: string };
    };
    notificationSettings?: {
        enabled: boolean;
        newRestaurants: boolean;
        newRecipes: boolean;
        communityUpdates: boolean;
        healthTips: boolean;
        promotions: boolean;
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
            required: process.env.NODE_ENV !== 'test', // Make password optional in test environment
            select: false,
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
        pushSubscription: {
            type: {
                endpoint: { type: String },
                keys: {
                    p256dh: { type: String },
                    auth: { type: String },
                },
            },
            required: false,
            default: undefined,
            _id: false,
        },
        notificationSettings: {
            type: {
                enabled: { type: Boolean, default: true },
                newRestaurants: { type: Boolean, default: true },
                newRecipes: { type: Boolean, default: true },
                communityUpdates: { type: Boolean, default: true },
                healthTips: { type: Boolean, default: false },
                promotions: { type: Boolean, default: false },
            },
            required: false,
            default: undefined,
            _id: false,
        },
    },
    { timestamps: true }
);

// WARNING: This hook only runs on .save(). Methods like updateOne(),
// findByIdAndUpdate(), findOneAndUpdate() bypass Mongoose middleware entirely.
// NEVER pass a plain-text password through those methods — always use .save()
// via UserService.updateUserPassword() to ensure hashing.
userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        // Guard: skip hashing if the value is already a bcrypt hash (e.g. seeded data).
        // bcrypt hashes always start with $2a$, $2b$, or $2y$ followed by a cost factor.
        const isBcryptHash = /^\$2[aby]\$\d{2}\$/.test(this.password);
        if (!isBcryptHash) {
            this.password = await bcrypt.hash(this.password, parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '10'));
        }
    }
    next();
});

userSchema.methods.matchPassword = async function (enteredPassword: string) {
    return await bcrypt.compare(enteredPassword, this.password);
};

export const User = (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>('User', userSchema);
